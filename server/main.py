# backend/main.py — complete (Phase 2 + 3 + 4 + 5 + ESP32 v2)
from contextlib import asynccontextmanager
from typing     import Optional
import shutil
import os
import re
import uuid

from fastapi import (
    FastAPI, UploadFile, File, HTTPException,
    Request, Header,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses       import FileResponse, JSONResponse
from pydantic                import BaseModel
from starlette.background    import BackgroundTask
from dotenv                  import load_dotenv

from stt     import transcribe_audio
from tts     import text_to_speech, text_to_wav
from chatbot import get_ai_reply

from database import (
    init_db, create_conversation, get_conversation,
    get_all_conversations, get_messages,
    add_message, delete_conversation, rename_conversation,
)

load_dotenv()


# ═════════════════════════════════════════════════════════════════════
#  CONSTANTS
# ═════════════════════════════════════════════════════════════════════

# Hard cap on the reply text that gets sent to TTS.
# At 16 kHz × 16-bit mono WAV = ~32 KB / second.
# 700 chars ≈ 25–30 s of audio ≈ ~850 KB WAV.
# Safe for a 2 MB ESP32 reply buffer with headroom.
MAX_TTS_CHARS = 700


# ═════════════════════════════════════════════════════════════════════
#  HELPERS
# ═════════════════════════════════════════════════════════════════════

def _sanitize_header(text: str, max_len: int = 400) -> str:
    """
    Make a string safe for use as an HTTP header value.
      - Collapses all whitespace (\\n, \\r, \\t) into single spaces
      - Replaces non-ASCII characters with '?'
      - Removes any remaining control characters (0–31, 127)
      - Truncates to max_len characters
    """
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    text = text.encode("ascii", errors="replace").decode("ascii")
    text = "".join(c for c in text if 32 <= ord(c) <= 126)
    return text[:max_len].strip()


def _truncate_for_tts(text: str, max_chars: int = MAX_TTS_CHARS) -> str:
    """
    Trim an AI reply so its TTS output fits in the ESP32's buffer.
    Truncates at the last sentence boundary before max_chars when possible.
    """
    if not text:
        return ""
    text = text.strip()
    if len(text) <= max_chars:
        return text

    # Try to cut at the last sentence-ending punctuation before the limit
    slice_ = text[:max_chars]
    for punct in (". ", "! ", "? "):
        idx = slice_.rfind(punct)
        if idx > max_chars // 2:          # don't cut too aggressively
            return slice_[: idx + 1].strip()

    # Fallback: cut at the last space
    idx = slice_.rfind(" ")
    if idx > 0:
        return slice_[:idx].strip()

    return slice_.strip()


# ═════════════════════════════════════════════════════════════════════
#  APP LIFESPAN
# ═════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Transcript",
        "X-Reply",
        "X-Conversation-Id",
    ],
)


@app.get("/")
def home():
    return {"status": "Server running ✅"}


# ═════════════════════════════════════════════════════════════════════
#  STT
# ═════════════════════════════════════════════════════════════════════

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    temp_path = f"temp_{uuid.uuid4().hex}.webm"
    contents = await audio.read()
    if len(contents) < 100:
        raise HTTPException(status_code=400, detail="Audio too small")

    with open(temp_path, "wb") as f:
        f.write(contents)

    try:
        text = transcribe_audio(temp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return {"text": text}


# ═════════════════════════════════════════════════════════════════════
#  TTS  (browser — returns MP3)
# ═════════════════════════════════════════════════════════════════════

class SpeakRequest(BaseModel):
    text: str
    lang: str = "en"


@app.post("/speak")
async def speak(request: SpeakRequest):
    audio_path = text_to_speech(request.text, request.lang)
    return FileResponse(
        path=audio_path, media_type="audio/mpeg", filename="reply.mp3"
    )


# ═════════════════════════════════════════════════════════════════════
#  CHAT  (browser)
# ═════════════════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None


@app.post("/chat")
async def chat(request: ChatRequest):
    if request.conversation_id:
        conv = await get_conversation(request.conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        title = request.message[:50] + ("..." if len(request.message) > 50 else "")
        conv = await create_conversation(title)

    if not conv or "id" not in conv:
        raise HTTPException(status_code=500, detail="Database error")

    conv_id = conv["id"]
    await add_message(conv_id, "user", request.message)

    db_messages = await get_messages(conv_id)
    messages_for_ai = [{"role": m["role"], "content": m["content"]} for m in db_messages]
    reply = get_ai_reply(messages_for_ai)

    await add_message(conv_id, "assistant", reply)
    return {"reply": reply, "conversation_id": conv_id}


# ═════════════════════════════════════════════════════════════════════
#  CONVERSATIONS
# ═════════════════════════════════════════════════════════════════════

@app.get("/conversations")
async def list_conversations():
    return await get_all_conversations()


@app.get("/conversations/{conv_id}/messages")
async def get_conv_messages(conv_id: int):
    conv = await get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return await get_messages(conv_id)


@app.delete("/conversations/{conv_id}")
async def delete_conv(conv_id: int):
    await delete_conversation(conv_id)
    return {"deleted": True, "conversation_id": conv_id}


@app.patch("/conversations/{conv_id}/title")
async def rename_conv(conv_id: int, body: dict):
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    conv = await rename_conversation(conv_id, title)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


# ═════════════════════════════════════════════════════════════════════
#  FILE CLEANUP
# ═════════════════════════════════════════════════════════════════════

def _remove_file(path: str) -> None:
    if os.path.exists(path):
        os.remove(path)


# ═════════════════════════════════════════════════════════════════════
#  ESP32-S3  —  COMBINED VOICE ENDPOINT
#  Returns: WAV audio in body, short metadata in headers
# ═════════════════════════════════════════════════════════════════════

@app.post("/esp32/voice")
async def esp32_voice(
    request: Request,
    x_conversation_id: Optional[str] = Header(None, alias="X-Conversation-Id"),
    x_lang: str = Header("en", alias="X-Lang"),
):
    # ── Step 1: Read WAV ─────────────────────────────────────────────
    audio_bytes = await request.body()
    if not audio_bytes or len(audio_bytes) < 100:
        raise HTTPException(400, "No audio received or audio too short")

    # ── Step 2: Save & transcribe ────────────────────────────────────
    temp_path = f"temp_esp32_{uuid.uuid4().hex}.wav"
    with open(temp_path, "wb") as f:
        f.write(audio_bytes)

    try:
        text = transcribe_audio(temp_path)
    except Exception as e:
        raise HTTPException(500, f"Transcription error: {e}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    text = text.strip()
    if not text:
        raise HTTPException(400, "Could not transcribe — audio too quiet or too short")

    print(f"[ESP32] Transcript: {text}")

    # ── Step 3: Conversation ─────────────────────────────────────────
    conv_id_int = int(x_conversation_id) if x_conversation_id else None
    if conv_id_int:
        conv = await get_conversation(conv_id_int)
        if not conv:
            conv = await create_conversation(text[:50])
    else:
        conv = await create_conversation(text[:50])

    if not conv or "id" not in conv:
        raise HTTPException(500, "Database error: Could not create/retrieve conversation")

    conv_id = conv["id"]

    # ── Step 4: Save user message ────────────────────────────────────
    await add_message(conv_id, "user", text)

    # ── Step 5: AI reply ─────────────────────────────────────────────
    db_messages = await get_messages(conv_id)
    messages_for_ai = [{"role": m["role"], "content": m["content"]} for m in db_messages]
    reply_full = get_ai_reply(messages_for_ai)

    print(f"[ESP32] Reply (full): {reply_full[:120]}...")

    # ── Step 6: Truncate reply for TTS so the WAV fits in ESP32 buffer ──
    reply_tts = _truncate_for_tts(reply_full, MAX_TTS_CHARS)
    print(f"[ESP32] Reply (TTS , {len(reply_tts)} chars): {reply_tts[:120]}...")

    # Save the FULL reply in the database so the browser shows it
    await add_message(conv_id, "assistant", reply_full)

    # ── Step 7: TTS → WAV ────────────────────────────────────────────
    wav_path = text_to_wav(reply_tts, x_lang)

    # ── Step 8: Short, safe headers ──────────────────────────────────
    # Headers are intentionally SHORT — the full text is fetched
    # separately by the ESP32 via /esp32/last_reply.
    safe_transcript = _sanitize_header(text,       max_len=200)
    safe_reply      = _sanitize_header(reply_tts,  max_len=180)

    print(f"[ESP32] Header reply preview: {safe_reply}...")

    return FileResponse(
        path=wav_path,
        media_type="audio/wav",
        filename="reply.wav",
        headers={
            "X-Transcript":      safe_transcript,
            "X-Reply":           safe_reply,
            "X-Conversation-Id": str(conv_id),
        },
        background=BackgroundTask(_remove_file, wav_path),
    )


# ═════════════════════════════════════════════════════════════════════
#  ESP32-S3  —  FETCH FULL LAST REPLY (for OLED scrolling)
#
#  GET /esp32/last_reply?conv_id=N
#  → JSON { "transcript": "...", "reply": "..." }
#
#  Called by the ESP32 right after /esp32/voice returns, so the OLED
#  can scroll both the question and the full AI answer.
# ═════════════════════════════════════════════════════════════════════

@app.get("/esp32/last_reply")
async def esp32_last_reply(conv_id: int):
    conv = await get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = await get_messages(conv_id)

    # Find the last user message and the last assistant message
    last_user = ""
    last_ai   = ""
    for m in reversed(msgs):
        if not last_ai and m["role"] == "assistant":
            last_ai = m["content"]
        elif not last_user and m["role"] == "user":
            last_user = m["content"]
        if last_user and last_ai:
            break

    return JSONResponse(
        content={
            "conversation_id": conv_id,
            "transcript":      last_user,
            "reply":           last_ai,
        }
    )

def _detect_action(transcript: str) -> str:
    """
    Returns 'PLAY_RADIO', 'STOP_MUSIC', or '' based on transcript keywords.
    """
    if not transcript:
        return ""
    t = transcript.lower().strip()

    play_kw = [
        "play music", "play radio", "play song", "play a song",
        "start music", "start radio", "play some music",
        "play the radio", "put on music", "play me music",
        "music please", "turn on music", "i want music",
    ]
    stop_kw = [
        "stop music", "stop radio", "stop the music",
        "turn off music", "turn off radio",
    ]

    for kw in play_kw:
        if kw in t:
            return "PLAY_RADIO"
    for kw in stop_kw:
        if kw in t:
            return "STOP_MUSIC"
    return ""
