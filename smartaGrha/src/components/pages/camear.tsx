// frontend/src/components/pages/camear.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../pagesmodulecss/camear.module.css';
import { getCameras, addCamera } from '../../services/api';

/* --------------------------------------------------------------
   Types
   -------------------------------------------------------------- */
interface Camera {
  _id: string;
  name: string;
  ip: string;
  userId: string;
}

interface CameraProps {
  darkMode: boolean;
}

interface FeedProps {
  camera: Camera;
  isPlaying: boolean;
  action: string;
  setAction: (action: string) => void;
  darkMode: boolean;
}

/* --------------------------------------------------------------
   Shared easing
   -------------------------------------------------------------- */
const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* --------------------------------------------------------------
   useDocumentVisible — cheap visibility gate for MJPEG streams
   -------------------------------------------------------------- */
const useDocumentVisible = () => {
  const [visible, setVisible] = useState(
    typeof document === 'undefined' ? true : !document.hidden
  );
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
};

/* ==============================================================
   CameraFeed — one monitor tile
   ============================================================== */
const CameraFeed: React.FC<FeedProps> = ({
  camera,
  isPlaying,
  action,
  setAction,
  darkMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  const WIDTH = 600;
  const HEIGHT = 400;

  const visible = useDocumentVisible();
  const streamUrl = useMemo(
    () => `http://localhost:5000/stream?ip=${encodeURIComponent(camera.ip)}`,
    [camera.ip]
  );

  /* ---- Attach / detach MJPEG source ---- */
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (isPlaying && visible) {
      img.crossOrigin = 'anonymous';
      img.onerror = () =>
        setStreamError(`Stream unavailable · ${camera.name}`);
      img.onload = () => setStreamError(null);
      img.src = streamUrl;
    } else {
      img.removeAttribute('src');
    }

    return () => {
      img.onerror = null;
      img.onload = null;
      img.removeAttribute('src');
    };
  }, [isPlaying, visible, streamUrl, camera.name]);

  /* ---- Mirror stream to canvas ---- */
  useEffect(() => {
    if (!isPlaying || !visible) return;

    let raf = 0;
    const draw = () => {
      const img = imgRef.current;
      const ctx = canvasRef.current?.getContext('2d');
      if (img && img.complete && img.naturalWidth && ctx) {
        ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(raf);
  }, [isPlaying, visible]);

  /* ---- Snapshot / Record actions ---- */
  const takeSnapshot = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img?.complete || !canvas) {
      setStreamError('No stream available');
      return;
    }
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${camera.name}-snapshot.png`;
    a.click();
  }, [camera.name]);

  const startRecording = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img?.complete || !canvas) {
      setStreamError('No stream available');
      return;
    }

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stream = canvas.captureStream(25);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    let raf = 0;
    const draw = () => {
      if (img.complete) ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      cancelAnimationFrame(raf);
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${camera.name}-video.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };

    recorder.start();
    setTimeout(() => recorder.stop(), 10_000);
  }, [camera.name]);

  useEffect(() => {
    if (action === 'snapshot') {
      takeSnapshot();
      setAction('none');
    } else if (action === 'download') {
      startRecording();
      setAction('none');
    }
  }, [action, setAction, takeSnapshot, startRecording]);

  return (
    <motion.div
      className={styles.feedContainer}
      layout
      layoutId={camera._id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className={styles.canvas}
      />
      <img ref={imgRef} alt="" aria-hidden="true" />

      {/* LIVE badge — motion-animated opacity so it feels alive */}
      <motion.span
        className={styles.liveBadge}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        LIVE
      </motion.span>

      {streamError && <div className={styles.error}>{streamError}</div>}

      <motion.div
        className={styles.feedInfo}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: EASE_OUT }}
      >
        <h2>{camera.name}</h2>
      </motion.div>
    </motion.div>
  );
};

/* ==============================================================
   CameraComponent — the page
   ============================================================== */
const CameraComponent: React.FC<CameraProps> = ({ darkMode }) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [action, setAction] = useState('none');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Watermark icons — first six only, rest hidden by CSS */
  const cctvIcons = [
    'mdi:cctv',
    'mdi:webcam',
    'mdi:security',
    'mdi:video',
    'mdi:camera-wireless',
    'mdi:motion-sensor',
  ];

  const refetchCameras = useCallback(async () => {
    try {
      const response = await getCameras();
      setCameras(response.data);
      if (response.data.length > 0 && selectedIndex >= response.data.length) {
        setSelectedIndex(0);
      }
      setError(null);
    } catch {
      setError('Failed to fetch cameras.');
    }
  }, [selectedIndex]);

  useEffect(() => {
    refetchCameras();
  }, [refetchCameras]);

  const handleAddCamera = async () => {
    const name = prompt('Enter Camera Name');
    let ip = prompt('Enter Camera IP Address (e.g., 192.168.1.15)');
    if (!name || !ip) return;

    ip = ip.replace(/^https?:\/\//, '').replace(/\/stream$/, '');
    try {
      await addCamera({ name, ip });
      await refetchCameras();
    } catch {
      setError('Failed to add camera.');
    }
  };

  /* ---- Layout math for the grid ---- */
  const cols = Math.ceil(Math.sqrt(viewMode));
  const rows = Math.ceil(viewMode / cols);

  const visibleCameras = useMemo(() => {
    if (cameras.length === 0) return [];
    if (viewMode === 1) {
      return [cameras[selectedIndex] ?? cameras[0]];
    }
    return cameras.slice(0, viewMode);
  }, [cameras, selectedIndex, viewMode]);

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      {/* ---------- Watermark icons ---------- */}
      <div className={styles.backgroundIcons} aria-hidden="true">
        {cctvIcons.map((icon, i) => (
          <motion.div
            key={icon}
            className={styles.iconItem}
            style={{
              top: `${(i * 41) % 82 + 6}%`,
              left: `${(i * 59) % 82 + 6}%`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, -10, 0] }}
            transition={{
              opacity: { duration: 0.6, delay: i * 0.08 },
              y: {
                duration: 9 + i * 0.6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.3,
              },
            }}
          >
            <img
              src={`https://api.iconify.design/${icon}.svg?color=${
                darkMode ? '%23f0ede7' : '%230e0e0c'
              }`}
              alt=""
              className={styles.deviceIcon}
            />
          </motion.div>
        ))}
      </div>

      {/* ---------- Header ---------- */}
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <div className={styles.title}>
          <h1>LiveView Hub</h1>
          <p>Camera Monitoring System</p>
        </div>

        <div className={styles.buttons}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            className={styles.addButton}
            onClick={handleAddCamera}
          >
            + Add Camera
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            className={styles.settingsButton}
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
          >
            Settings
          </motion.button>
        </div>
      </motion.header>

      {/* ---------- Settings strip ---------- */}
      <AnimatePresence initial={false}>
        {showSettings && (
          <motion.div
            className={styles.settingsPanel}
            layout
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
            style={{ overflow: 'hidden' }}
          >
            <button
              type="button"
              onClick={() =>
                document.getElementById('grid')?.requestFullscreen()
              }
            >
              Fullscreen
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((v) => !v)}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => setAction('snapshot')}
            >
              Snapshot
            </button>
            <button
              type="button"
              onClick={() => setAction('download')}
            >
              Record 10s
            </button>

            <select
              aria-label="View mode"
              value={viewMode}
              onChange={(e) => setViewMode(parseInt(e.target.value, 10))}
            >
              {[1, 2, 4, 8, 16].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Frame' : 'Frames'}
                </option>
              ))}
            </select>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Error banner ---------- */}
      <AnimatePresence>
        {error && (
          <motion.div
            className={styles.error}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'relative',
              margin: '0 auto 1rem',
              maxWidth: 1400,
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Main layout ---------- */}
      <div className={styles.mainContent}>
        <motion.div
          id="grid"
          className={styles.cameraGrid}
          layout
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
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

        {/* ---------- Camera list ---------- */}
        <aside className={styles.cameraList} aria-label="Camera channels">
          <h3>Channels · {cameras.length}</h3>

          {cameras.map((camera, index) => {
            const isSelected = viewMode === 1 && selectedIndex === index;
            return (
              <motion.div
                key={camera._id}
                className={`${styles.cameraItem} ${
                  isSelected ? styles.selected : ''
                }`}
                layout
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                onClick={() => setSelectedIndex(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedIndex(index);
                  }
                }}
              >
                <img
                  src={`http://localhost:5000/stream?ip=${encodeURIComponent(
                    camera.ip
                  )}`}
                  alt=""
                  className={styles.cameraThumbnail}
                  crossOrigin="anonymous"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden';
                  }}
                />
                <span>{camera.name}</span>
              </motion.div>
            );
          })}

          {cameras.length === 0 && (
            <p
              style={{
                margin: '0.75rem 0.25rem',
                fontSize: '0.82rem',
                color: 'var(--ink-3)',
              }}
            >
              No cameras yet.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default CameraComponent;
