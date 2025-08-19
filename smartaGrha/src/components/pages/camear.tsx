import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../pagesmodulecss/camear.module.css';
import { getCameras, addCamera } from '../../services/api';

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

const CameraFeed: React.FC<FeedProps> = ({ camera, isPlaying, action, setAction, darkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const width = 600;
  const height = 400;

  useEffect(() => {
    if (isPlaying && imgRef.current) {
      const mjpegUrl = `http://localhost:5000/stream?ip=${encodeURIComponent(camera.ip)}`;
      imgRef.current.src = mjpegUrl;
      imgRef.current.crossOrigin = 'anonymous';
      imgRef.current.onerror = () => {
        setStreamError(`Failed to load MJPEG stream from ${camera.name}.`);
      };
      imgRef.current.onload = () => setStreamError(null);
    } else if (imgRef.current) {
      imgRef.current.src = '';
    }
    return () => {
      if (imgRef.current) imgRef.current.src = '';
    };
  }, [isPlaying, camera.ip]);

  useEffect(() => {
    let drawing = false;
    const drawLoop = () => {
      if (!isPlaying || !drawing || !imgRef.current?.complete) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && imgRef.current) {
        ctx.drawImage(imgRef.current, 0, 0, width, height);
      }
      requestAnimationFrame(drawLoop);
    };
    if (isPlaying) {
      drawing = true;
      drawLoop();
    }
    return () => {
      drawing = false;
    };
  }, [isPlaying]);

  useEffect(() => {
    if (action === 'snapshot') {
      takeSnapshot();
      setAction('none');
    } else if (action === 'download') {
      startRecording();
      setAction('none');
    }
  }, [action]);

  const takeSnapshot = () => {
    if (canvasRef.current && imgRef.current?.complete) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(imgRef.current, 0, 0, width, height);
        const data = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = data;
        a.download = `${camera.name}-snapshot.png`;
        a.click();
      }
    } else {
      setStreamError('No stream available');
    }
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
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(imgRef.current, 0, 0, width, height);
        requestAnimationFrame(drawFrame);
      };
      drawFrame();
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${camera.name}-video.webm`;
        a.click();
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 10000);
    } else {
      setStreamError('No stream available');
    }
  };

  return (
    <motion.div
      className={`${styles.feedContainer} ${darkMode ? styles.dark : ''}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      {streamError && <div className={styles.error}>{streamError}</div>}
      <canvas ref={canvasRef} width={width} height={height} className={styles.canvas} />
      <img ref={imgRef} style={{ display: 'none' }} alt="hidden stream" />
      <motion.div
        className={styles.feedInfo}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2>{camera.name}</h2>
      </motion.div>
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

  // CCTV-themed icons from Iconify
  const cctvIcons = [
    'mdi:cctv', // CCTV Camera
    'mdi:webcam', // Webcam
    'mdi:security', // Security
    'mdi:motion-sensor', // Motion Sensor
    'mdi:video', // Video
    'mdi:camera', // Camera
    'mdi:camera-wireless', // Wireless Camera
    'mdi:camera-outline', // Camera Outline
    'mdi:sparkle' // Sparkle for smoke effect
  ];

  const refetchCameras = async () => {
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
  };

  useEffect(() => {
    refetchCameras();
  }, []);

  const handleAddCamera = async () => {
    const name = prompt('Enter Camera Name');
    let ip = prompt('Enter Camera IP Address (e.g., 192.168.1.15)');
    if (name && ip) {
      ip = ip.replace(/^http:\/\//, '').replace(/\/stream$/, '');
      try {
        await addCamera({ name, ip });
        await refetchCameras();
        alert('Camera added successfully!');
      } catch {
        setError('Failed to add camera.');
      }
    }
  };

  const cols = Math.ceil(Math.sqrt(viewMode));
  const rows = Math.ceil(viewMode / cols);
  const visibleCameras =
    viewMode === 1 && cameras.length > 0 ? [cameras[selectedIndex]] : cameras.slice(0, viewMode);

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      {/* Background Animated Icons */}
      <div className={styles.backgroundIcons}>
        {Array.from({ length: 12 }).map((_, index) => {
          const icon = cctvIcons[Math.floor(Math.random() * cctvIcons.length)];
          return (
            <motion.div
              key={index}
              className={styles.iconItem}
              style={{
                top: `${Math.random() * 90}%`,
                left: `${Math.random() * 90}%`,
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
                y: [0, -15, 0],
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
                delay: Math.random() * 2,
              }}
              whileHover={{
                scale: 1.2,
                rotate: 0,
                opacity: 0.8,
                transition: { duration: 0.3 },
              }}
            >
              <img
                src={`https://api.iconify.design/${icon}.svg?color=${darkMode ? '%23ffffff' : '%23888888'}`}
                alt={icon}
                className={styles.deviceIcon}
              />
              {icon === 'mdi:sparkle' && (
                <div className={styles.smokeEffect}></div>
              )}
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className={styles.header}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80 }}
      >
        <div className={styles.title}>
          <h1>📹 LiveView Hub</h1>
          <p>Camera Monitoring System</p>
        </div>
        <div className={styles.buttons}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className={styles.addButton}
            onClick={handleAddCamera}
          >
            + Add Camera
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className={styles.settingsButton}
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙ Settings
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            className={styles.settingsPanel}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <button onClick={() => document.getElementById('grid')?.requestFullscreen()}>
              Fullscreen
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? 'Pause' : 'Play'}</button>
            <button onClick={() => setAction('snapshot')}>Snapshot 📸</button>
            <button onClick={() => setAction('download')}>Download Video ⬇️</button>
            <select value={viewMode} onChange={(e) => setViewMode(parseInt(e.target.value))}>
              {[1, 2, 4, 8, 16].map((n) => (
                <option key={n} value={n}>
                  {n} Frames
                </option>
              ))}
            </select>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.mainContent}>
        <motion.div
          id="grid"
          className={styles.cameraGrid}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
          layout
        >
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
        </motion.div>

        <div className={styles.cameraList}>
          <h3>Camera List</h3>
          {cameras.map((camera, index) => (
            <motion.div
              key={camera._id}
              className={`${styles.cameraItem} ${viewMode === 1 && selectedIndex === index ? styles.selected : ''}`}
              whileHover={{ scale: 1.03 }}
              onClick={() => setSelectedIndex(index)}
            >
              <img
                src={`http://localhost:5000/stream?ip=${encodeURIComponent(camera.ip)}`}
                alt={camera.name}
                className={styles.cameraThumbnail}
                crossOrigin="anonymous"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span>{camera.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CameraComponent;
