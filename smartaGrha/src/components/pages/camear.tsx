// src/Components/pages/camear.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../pagesmodulecss/camear.module.css';

import { getCameras, addCamera } from '../../services/api';

interface Camera { _id: string; name: string; ip: string; userId: string; }
interface CameraProps { darkMode: boolean; }
interface FeedProps {
  camera: Camera; isPlaying: boolean; action: string;
  setAction: (action: string) => void; darkMode: boolean;
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const CameraFeed: React.FC<FeedProps> = ({ camera, isPlaying, action, setAction, darkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const isAudioEnabledRef = useRef<boolean>(false);
  
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const width = 600; 
  const height = 400;

  // --- 1. WebSocket Video & Audio Streaming ---
  useEffect(() => {
    if (!isPlaying) {
      if (wsRef.current) wsRef.current.close();
      return;
    }

    // Connect to Relay Server (Assuming all cameras use the same relay)
    const ws = new WebSocket('ws://192.168.1.5:8080');
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => setStreamError(null);
    ws.onerror = () => setStreamError(`Failed to connect to relay for ${camera.name}.`);
    ws.onclose = () => setStreamError('Stream disconnected.');

    ws.onmessage = (event: MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) return;
      const buffer = event.data as ArrayBuffer;
      const view = new Uint8Array(buffer);
      const packetType = view[0];

      if (packetType === 0x01) {
        // --- VIDEO DECODING ---
        const jpegData = buffer.slice(1);
        const blob = new Blob([jpegData], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && canvasRef.current) {
            ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
          }
          URL.revokeObjectURL(url);
        };
        img.src = url;
      } else if (packetType === 0x02) {
        // --- AUDIO DECODING ---
        if (!audioCtxRef.current || !isAudioEnabledRef.current) return;

        const pcmData = buffer.slice(1);
        const int16Array = new Int16Array(pcmData);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        const audioCtx = audioCtxRef.current;
        const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 16000);
        audioBuffer.copyToChannel(float32Array, 0);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now;
        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += audioBuffer.duration;
      }
    };

    return () => {
      ws.close();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [isPlaying, camera.ip]);

  const enableAudio = async () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass({ sampleRate: 16000 });
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      isAudioEnabledRef.current = true;
      setIsAudioEnabled(true);
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  // --- 2. Action Handlers (Snapshot & Record) ---
  useEffect(() => {
    if (action === 'snapshot') { takeSnapshot(); setAction('none'); }
    else if (action === 'download') { startRecording(); setAction('none'); }
  }, [action]);

  const takeSnapshot = () => {
    if (canvasRef.current) {
      const a = document.createElement('a');
      a.href = canvasRef.current.toDataURL('image/png');
      a.download = `${camera.name}-snapshot.png`;
      a.click();
    }
  };

  const startRecording = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const stream = canvas.captureStream(25);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; 
        a.download = `${camera.name}-record.webm`;
        a.click();
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 10000);
    }
  };

  return (
    <motion.div
      className={styles.feed}
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className={styles.feedFrame} style={{ position: 'relative' }}>
        <canvas ref={canvasRef} width={width} height={height} className={styles.canvas} />

        {streamError && (
          <div className={styles.feedError}>
            <span className={styles.feedErrorDot} /> {streamError}
          </div>
        )}

        {/* Live Indicator */}
        {isPlaying && !streamError && (
          <div className={styles.liveTag}>
            <motion.span className={styles.liveDot} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
            LIVE
          </div>
        )}

        {/* Audio Enable Button */}
        {!isAudioEnabled && isPlaying && (
          <button
            onClick={enableAudio}
            style={{
              position: 'absolute', bottom: '10px', right: '10px', zIndex: 10,
              padding: '6px 12px', backgroundColor: '#2563eb', color: 'white',
              borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px'
            }}
          >
            🔊 Enable Audio
          </button>
        )}
      </div>

      <div className={styles.feedBar}>
        <span className={styles.feedName}>{camera.name}</span>
        <span className={styles.feedIp}>{camera.ip}</span>
      </div>
    </motion.div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const CameraComponent: React.FC<CameraProps> = ({ darkMode }) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [action, setAction] = useState('none');
  const [showSettings, setShowSettings] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  const refetchCameras = async () => {
    try {
      const response = await getCameras();
      setCameras(response.data);
      if (response.data.length > 0 && selectedIndex >= response.data.length) setSelectedIndex(0);
    } catch { setError('Failed to fetch cameras.'); }
  };

  useEffect(() => { refetchCameras(); }, []);

  const handleAddCamera = async () => {
    const name = prompt('Enter Camera Name');
    let ip = prompt('Enter Camera IP Address (e.g., 192.168.1.5)');
    if (name && ip) {
      try {
        await addCamera({ name, ip });
        await refetchCameras();
        alert('Camera added successfully!');
      } catch { setError('Failed to add camera.'); }
    }
  };

  const cols = Math.ceil(Math.sqrt(viewMode));
  const rows = Math.ceil(viewMode / cols);
  const visibleCameras =
    viewMode === 1 && cameras.length > 0 ? [cameras[selectedIndex]] : cameras.slice(0, viewMode);

  const iconColor = darkMode ? '%23f0ede7' : '%230e0e0c';

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>Security · Cameras</p>
          <h1 className={styles.title}>LiveView_2026</h1>
        </div>
        <div className={styles.toolbar}>
          <motion.button className={styles.ghostBtn} onClick={() => setShowSettings(!showSettings)} whileTap={{ scale: 0.96 }}>
            <img src={`https://api.iconify.design/mdi:tune.svg?color=${iconColor}`} alt="" width={14} height={14} /> Controls
          </motion.button>
          <motion.button className={styles.primaryBtn} onClick={handleAddCamera} whileTap={{ scale: 0.96 }}>
            <img src={`https://api.iconify.design/mdi:plus.svg?color=${darkMode ? '%230e0e0c' : '%23f0ede7'}`} alt="" width={14} height={14} /> Add camera
          </motion.button>
        </div>
      </header>

      {/* Control drawer */}
      <AnimatePresence initial={false}>
        {showSettings && (
          <motion.section className={styles.drawer} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div className={styles.drawerInner}>
              <div className={styles.drawerGroup}>
                <span className={styles.drawerLabel}>Playback</span>
                <button className={styles.chip} onClick={() => document.getElementById('grid')?.requestFullscreen()}>Fullscreen</button>
                <button className={`${styles.chip} ${!isPlaying ? styles.chipActive : ''}`} onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? 'Pause' : 'Resume'}
                </button>
              </div>
              <div className={styles.drawerGroup}>
                <span className={styles.drawerLabel}>Capture</span>
                <button className={styles.chip} onClick={() => setAction('snapshot')}>Snapshot</button>
                <button className={styles.chip} onClick={() => setAction('download')}>Record 10s</button>
              </div>
              <div className={styles.drawerGroup}>
                <span className={styles.drawerLabel}>Grid</span>
                {[1, 2, 4, 8, 16].map((n) => (
                  <button key={n} className={`${styles.chip} ${viewMode === n ? styles.chipActive : ''}`} onClick={() => setViewMode(n)}>{n}</button>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={styles.main}>
        <motion.div id="grid" className={styles.grid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }} layout>
          <AnimatePresence mode="popLayout">
            {visibleCameras.map((cam) => (
              <CameraFeed key={cam._id} camera={cam} isPlaying={isPlaying} action={action} setAction={setAction} darkMode={darkMode} />
            ))}
          </AnimatePresence>
        </motion.div>

        <aside className={styles.sidebar}>
          <header className={styles.sidebarHead}>
            <span>Cameras</span>
            <span className={styles.sidebarCount}>{cameras.length}</span>
          </header>
          <ul className={styles.camList}>
            {cameras.map((camera, index) => {
              const isSelected = viewMode === 1 && selectedIndex === index;
              return (
                <li key={camera._id}>
                  <button className={`${styles.camItem} ${isSelected ? styles.camItemActive : ''}`} onClick={() => setSelectedIndex(index)}>
                    <span className={styles.camMeta}>
                      <span className={styles.camName}>{camera.name}</span>
                      <span className={styles.camIp}>{camera.ip}</span>
                    </span>
                    {isSelected && <span className={styles.camLive} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
};

export default CameraComponent;
