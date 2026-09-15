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
  const imgRef = useRef<HTMLImageElement>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const width = 600; const height = 400;

  useEffect(() => {
    if (isPlaying && imgRef.current) {
      const mjpegUrl = `http://localhost:5000/stream?ip=${encodeURIComponent(camera.ip)}`;
      imgRef.current.src = mjpegUrl;
      imgRef.current.crossOrigin = 'anonymous';
      imgRef.current.onerror = () => setStreamError(`Failed to load stream from ${camera.name}.`);
      imgRef.current.onload = () => setStreamError(null);
    } else if (imgRef.current) {
      imgRef.current.src = '';
    }
    return () => { if (imgRef.current) imgRef.current.src = ''; };
  }, [isPlaying, camera.ip]);

  useEffect(() => {
    let drawing = false;
    const drawLoop = () => {
      if (!isPlaying || !drawing || !imgRef.current?.complete) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && imgRef.current) ctx.drawImage(imgRef.current, 0, 0, width, height);
      requestAnimationFrame(drawLoop);
    };
    if (isPlaying) { drawing = true; drawLoop(); }
    return () => { drawing = false; };
  }, [isPlaying]);

  useEffect(() => {
    if (action === 'snapshot') { takeSnapshot(); setAction('none'); }
    else if (action === 'download') { startRecording(); setAction('none'); }
  }, [action]);

  const takeSnapshot = () => {
    if (canvasRef.current && imgRef.current?.complete) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = width; canvas.height = height;
        ctx.drawImage(imgRef.current, 0, 0, width, height);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `${camera.name}-snapshot.png`;
        a.click();
      }
    } else setStreamError('No stream available');
  };

  const startRecording = () => {
    if (canvasRef.current && imgRef.current?.complete) {
      const canvas = canvasRef.current;
      const stream = canvas.captureStream(25);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      const ctx = canvas.getContext('2d');
      const drawFrame = () => {
        if (!ctx || !imgRef.current?.complete) return;
        canvas.width = width; canvas.height = height;
        ctx.drawImage(imgRef.current, 0, 0, width, height);
        requestAnimationFrame(drawFrame);
      };
      drawFrame();
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${camera.name}-video.webm`;
        a.click();
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 10000);
    } else setStreamError('No stream available');
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
      <div className={styles.feedFrame}>
        <canvas ref={canvasRef} width={width} height={height} className={styles.canvas} />
        <img ref={imgRef} style={{ display: 'none' }} alt="" />

        {streamError && (
          <div className={styles.feedError}>
            <span className={styles.feedErrorDot} />
            {streamError}
          </div>
        )}

        {/* Live indicator */}
        {isPlaying && !streamError && (
          <div className={styles.liveTag}>
            <motion.span
              className={styles.liveDot}
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            LIVE
          </div>
        )}
      </div>

      <div className={styles.feedBar}>
        <span className={styles.feedName}>{camera.name}</span>
        <span className={styles.feedIp}>{camera.ip}</span>
      </div>
    </motion.div>
  );
};

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
      setError(null);
    } catch { setError('Failed to fetch cameras.'); }
  };

  useEffect(() => { refetchCameras(); }, []);

  const handleAddCamera = async () => {
    const name = prompt('Enter Camera Name');
    let ip = prompt('Enter Camera IP Address (e.g., 192.168.1.15)');
    if (name && ip) {
      ip = ip.replace(/^http:\/\//, '').replace(/\/stream$/, '');
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
      {/* ---------- Top bar ---------- */}
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>Security · Cameras</p>
          <h1 className={styles.title}>LiveView Hub</h1>
        </div>

        <div className={styles.toolbar}>
          <motion.button
            className={styles.ghostBtn}
            onClick={() => setShowSettings(!showSettings)}
            whileTap={{ scale: 0.96 }}
          >
            <img src={`https://api.iconify.design/mdi:tune.svg?color=${iconColor}`} alt="" width={14} height={14} />
            Controls
          </motion.button>
          <motion.button
            className={styles.primaryBtn}
            onClick={handleAddCamera}
            whileTap={{ scale: 0.96 }}
          >
            <img src={`https://api.iconify.design/mdi:plus.svg?color=${darkMode ? '%230e0e0c' : '%23f0ede7'}`} alt="" width={14} height={14} />
            Add camera
          </motion.button>
        </div>
      </header>

      {/* ---------- Control drawer ---------- */}
      <AnimatePresence initial={false}>
        {showSettings && (
          <motion.section
            className={styles.drawer}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <div className={styles.drawerInner}>
              <div className={styles.drawerGroup}>
                <span className={styles.drawerLabel}>Playback</span>
                <button
                  className={styles.chip}
                  onClick={() => document.getElementById('grid')?.requestFullscreen()}
                >
                  Fullscreen
                </button>
                <button
                  className={`${styles.chip} ${!isPlaying ? styles.chipActive : ''}`}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
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
                  <button
                    key={n}
                    className={`${styles.chip} ${viewMode === n ? styles.chipActive : ''}`}
                    onClick={() => setViewMode(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ---------- Main ---------- */}
      <div className={styles.main}>
        <motion.div
          id="grid"
          className={styles.grid}
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
          layout
        >
          <AnimatePresence mode="popLayout">
            {visibleCameras.map((cam) => (
              <CameraFeed
                key={cam._id}
                camera={cam}
                isPlaying={isPlaying}
                action={action}
                setAction={setAction}
                darkMode={darkMode}
              />
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
                  <button
                    className={`${styles.camItem} ${isSelected ? styles.camItemActive : ''}`}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <span className={styles.camThumbWrap}>
                      <img
                        src={`http://localhost:5000/stream?ip=${encodeURIComponent(camera.ip)}`}
                        alt={camera.name}
                        className={styles.camThumb}
                        crossOrigin="anonymous"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </span>
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
