'''
# backend/database.py
import os
from datetime import datetime
from typing   import List, Optional

from sqlalchemy import (
    Integer, String, Text,
    DateTime, ForeignKey, create_engine,
)
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, mapped_column,
    relationship, sessionmaker, Session,
)
from dotenv import load_dotenv

load_dotenv()


# ─────────────────────────────────────────────────────
# ENGINE & SESSION
# ─────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chatbot.db")

engine = create_engine(
    DATABASE_URL,
    connect_args=(
        {"check_same_thread": False}
        if "sqlite" in DATABASE_URL
        else {}
    ),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ─────────────────────────────────────────────────────
# BASE
# ─────────────────────────────────────────────────────

class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base."""
    pass


# ─────────────────────────────────────────────────────
# MODELS (Tables)
# ─────────────────────────────────────────────────────

class Conversation(Base):
    __tablename__ = "conversations"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    title:      Mapped[str]      = mapped_column(String(200), default="New Chat")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # One conversation → many messages
    messages: Mapped[List["Message"]] = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(Base):
    __tablename__ = "messages"

    id:              Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int]      = mapped_column(
        Integer, ForeignKey("conversations.id"), nullable=False
    )
    role:            Mapped[str]      = mapped_column(String(20), nullable=False)
    content:         Mapped[str]      = mapped_column(Text,       nullable=False)
    created_at:      Mapped[datetime] = mapped_column(DateTime,   default=datetime.utcnow)

    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages"
    )


# ─────────────────────────────────────────────────────
# INIT — called once when server starts
# ─────────────────────────────────────────────────────

def init_db():
    """
    Creates all tables if they don't already exist.
    Safe to call multiple times — never deletes existing data.
    """
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables ready")


# ─────────────────────────────────────────────────────
# DB SESSION — dependency for FastAPI routes
# ─────────────────────────────────────────────────────

def get_db():
    """
    Opens a DB session for one request, closes it after.
    Use with FastAPI's Depends() inside route functions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────────────
# CONVERSATION CRUD
# ─────────────────────────────────────────────────────

def create_conversation(
    db: Session,
    title: str = "New Chat",
) -> Conversation:
    """Start a brand new conversation. Returns the new Conversation object."""
    conv = Conversation(title=title)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def get_conversation(
    db: Session,
    conv_id: int,
) -> Optional[Conversation]:
    """Get one conversation by its ID. Returns None if not found."""
    return (
        db.query(Conversation)
        .filter(Conversation.id == conv_id)
        .first()
    )


def get_all_conversations(db: Session) -> List[Conversation]:
    """Return all conversations, newest first."""
    return (
        db.query(Conversation)
        .order_by(Conversation.created_at.desc())
        .all()
    )


def rename_conversation(
    db: Session,
    conv_id: int,
    title: str,
) -> Optional[Conversation]:
    """Rename a conversation. Returns updated object or None if not found."""
    conv = get_conversation(db, conv_id)
    if not conv:
        return None
    conv.title = title          # ← now typed as str, no Pylance error
    db.commit()
    db.refresh(conv)
    return conv


def delete_conversation(db: Session, conv_id: int) -> bool:
    """
    Delete a conversation and all its messages.
    Returns True if deleted, False if not found.
    """
    conv = get_conversation(db, conv_id)
    if not conv:
        return False
    db.delete(conv)
    db.commit()
    return True


# ─────────────────────────────────────────────────────
# MESSAGE CRUD
# ─────────────────────────────────────────────────────

def add_message(
    db: Session,
    conv_id: int,
    role: str,
    content: str,
) -> Message:
    """
    Save one message to the database.
    role must be "user" or "assistant".
    """
    msg = Message(
        conversation_id=conv_id,
        role=role,
        content=content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_messages(
    db: Session,
    conv_id: int,
) -> List[Message]:
    """Return all messages in a conversation, oldest first."""
    return (
        db.query(Message)
        .filter(Message.conversation_id == conv_id)
        .order_by(Message.created_at)
        .all()
    )




# ─────────────────────────────────────────────────────
# QUICK TEST — run: python database.py
# ─────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()

    db = SessionLocal()

    conv = create_conversation(db, title="Test conversation")
    print(f"Created conversation: id={conv.id}, title={conv.title}")

    add_message(db, conv.id, "user",      "Hello! What is Python?")
    add_message(db, conv.id, "assistant", "Python is a popular programming language.")
    add_message(db, conv.id, "user",      "Give me an example.")
    add_message(db, conv.id, "assistant", "Sure! print('Hello World')")

    msgs = get_messages(db, conv.id)
    print(f"\nMessages in conversation {conv.id}:")
    for m in msgs:
        print(f"  [{m.role}] {m.content}")

    all_convs = get_all_conversations(db)
    print(f"\nTotal conversations: {len(all_convs)}")

    db.close()
    print("\n✅ database.py is working correctly!")

'''    

# backend/database.py
import os
import httpx
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any

load_dotenv()

CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_D1_DATABASE_ID = os.getenv("CLOUDFLARE_D1_DATABASE_ID")
CLOUDFLARE_D1_API_TOKEN = os.getenv("CLOUDFLARE_D1_API_TOKEN")

D1_API_URL = (
    f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}"
    f"/d1/database/{CLOUDFLARE_D1_DATABASE_ID}/query"
)

HEADERS = {
    "Authorization": f"Bearer {CLOUDFLARE_D1_API_TOKEN}",
    "Content-Type": "application/json",
}


async def execute_sql(
    sql: str, params: Optional[List[Any]] = None
) -> List[Dict[str, Any]]:
    """
    Executes a single SQL query against the Cloudflare D1 database.
    Returns a list of result rows (as dictionaries) for SELECT queries,
    or an empty list for INSERT/UPDATE/DELETE.
    """
    if not all(
        [
            CLOUDFLARE_ACCOUNT_ID,
            CLOUDFLARE_D1_DATABASE_ID,
            CLOUDFLARE_D1_API_TOKEN,
        ]
    ):
        print("⚠️ D1 credentials missing — SQL execution skipped.")
        return []

    # FIXED: Explicit type annotation to prevent Pylance error
    payload: Dict[str, Any] = {"sql": sql}
    if params:
        payload["params"] = params

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            r = await client.post(D1_API_URL, headers=HEADERS, json=payload)
            r.raise_for_status()
            data = r.json()
            if not data.get("success"):
                print(f"❌ D1 Query Error: {data.get('errors')}")
                return []
            # D1 returns results in a nested structure
            return data.get("result", [{}])[0].get("results", [])
        except Exception as e:
            print(f"❌ D1 Connection Error [{type(e).__name__}]: {e}")
            return []


# ─────────────────────────────────────────────────────
# SCHEMA & INITIALIZATION
# ─────────────────────────────────────────────────────

CREATE_CONVERSATIONS_TABLE = """
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

CREATE_MESSAGES_TABLE = """
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
);
"""


async def init_db():
    """Creates the necessary tables if they don't exist."""
    await execute_sql(CREATE_CONVERSATIONS_TABLE)
    await execute_sql(CREATE_MESSAGES_TABLE)
    print("✅ D1 tables initialized.")


# ─────────────────────────────────────────────────────
# CONVERSATION & MESSAGE OPERATIONS
# ─────────────────────────────────────────────────────


async def create_conversation(title: str) -> Dict[str, Any]:
    result = await execute_sql(
        "INSERT INTO conversations (title) VALUES (?) RETURNING id, title, created_at;",
        [title],
    )
    return result[0] if result else {}


async def get_conversation(conv_id: int) -> Optional[Dict[str, Any]]:
    result = await execute_sql(
        "SELECT id, title, created_at FROM conversations WHERE id = ?;",
        [conv_id],
    )
    return result[0] if result else None


async def get_all_conversations() -> List[Dict[str, Any]]:
    return await execute_sql(
        "SELECT id, title, created_at FROM conversations ORDER BY created_at DESC;"
    )


async def delete_conversation(conv_id: int) -> bool:
    await execute_sql(
        "DELETE FROM messages WHERE conversation_id = ?;", [conv_id]
    )
    await execute_sql("DELETE FROM conversations WHERE id = ?;", [conv_id])
    return True


async def rename_conversation(
    conv_id: int, new_title: str
) -> Optional[Dict[str, Any]]:
    result = await execute_sql(
        "UPDATE conversations SET title = ? WHERE id = ? RETURNING id, title, created_at;",
        [new_title, conv_id],
    )
    return result[0] if result else None


async def add_message(conv_id: int, role: str, content: str):
    await execute_sql(
        "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?);",
        [conv_id, role, content],
    )


async def get_messages(conv_id: int) -> List[Dict[str, Any]]:
    return await execute_sql(
        "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC;",
        [conv_id],
    )
