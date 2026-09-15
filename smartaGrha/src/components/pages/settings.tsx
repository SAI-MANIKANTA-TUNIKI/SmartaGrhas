// src/Components/Pages/settings.tsx
import React, { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import styles from '../pagesmodulecss/settings.module.css';

interface SettingsPageProps {
  darkMode: boolean;
  onToggleDarkMode: (newMode: boolean) => void;
  handleSignOut: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const rowIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const SettingsPage: React.FC<SettingsPageProps> = ({
  darkMode,
  onToggleDarkMode,
  handleSignOut,
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [devices, setDevices] = useState<string[]>([]);
  const [bluetoothDevice, setBluetoothDevice] = useState<any>(null);

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (deviceName.trim()) {
      setDevices([...devices, deviceName]);
      sendDeviceToESP32(deviceName);
      setDeviceName('');
    }
  };

  const sendDeviceToESP32 = (name: string) => {
    console.log(`Sending HTTP request to ESP32 with device name: ${name}`);
    fetch('http://esp32.local/add-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceName: name }),
    })
      .then((response) => response.json())
      .then((data) => console.log('ESP32 Response:', data))
      .catch((error) => console.error('ESP32 HTTP Error:', error));
  };

  const connectToDevice = async () => {
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ namePrefix: 'ESP32' }],
        optionalServices: ['battery_service'],
      });
      const server = await device.gatt?.connect();
      console.log('Connected to ESP32 via Bluetooth:', server);
      setBluetoothDevice(device);

      device.addEventListener('gattserverdisconnected', () => {
        console.log('ESP32 Disconnected');
        setBluetoothDevice(null);
      });
    } catch (error) {
      console.error('Bluetooth Connection Error:', error);
    }
  };

  //const iconColor = darkMode ? '%23f0ede7' : '%230e0e0c';

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>Preferences</p>
          <h1 className={styles.title}>Settings</h1>
        </div>
      </header>

      <motion.div
        className={styles.stack}
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* ---------- Appearance ---------- */}
        <motion.section className={styles.section} variants={rowIn}>
          <header className={styles.sectionHead}>
            <h2>Appearance</h2>
            <p>How the interface looks and reads.</p>
          </header>

          <div className={styles.rowList}>
            <div className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Dark mode</span>
                <span className={styles.rowHint}>Reduce glare in low light</span>
              </div>
              <button
                type="button"
                className={`${styles.switch} ${darkMode ? styles.switchOn : ''}`}
                onClick={() => onToggleDarkMode(!darkMode)}
                aria-pressed={darkMode}
              >
                <motion.span
                  className={styles.switchHandle}
                  layout
                  transition={{ type: 'spring', stiffness: 520, damping: 32 }}
                />
              </button>
            </div>
          </div>
        </motion.section>

        {/* ---------- Notifications ---------- */}
        <motion.section className={styles.section} variants={rowIn}>
          <header className={styles.sectionHead}>
            <h2>Notifications</h2>
            <p>Whether this device receives alerts and updates.</p>
          </header>

          <div className={styles.rowList}>
            <div className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Enable notifications</span>
                <span className={styles.rowHint}>Room activity, motion, and sensor alerts</span>
              </div>
              <button
                type="button"
                className={`${styles.switch} ${notificationsEnabled ? styles.switchOn : ''}`}
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                aria-pressed={notificationsEnabled}
              >
                <motion.span
                  className={styles.switchHandle}
                  layout
                  transition={{ type: 'spring', stiffness: 520, damping: 32 }}
                />
              </button>
            </div>
          </div>
        </motion.section>

        {/* ---------- Devices ---------- */}
        <motion.section className={styles.section} variants={rowIn}>
          <header className={styles.sectionHead}>
            <h2>Devices</h2>
            <p>Register new hardware to your home network.</p>
          </header>

          <form onSubmit={handleAddDevice} className={styles.form}>
            <div className={styles.inputWrap}>
              <span className={styles.inputLabel}>Device name</span>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Living Room Lamp"
                className={styles.input}
              />
            </div>
            <button type="submit" className={styles.primaryBtn}>
              <img
                src={`https://api.iconify.design/mdi:plus.svg?color=${
                  darkMode ? '%230e0e0c' : '%23f0ede7'
                }`}
                alt="" width={14} height={14}
              />
              Add device
            </button>
          </form>

          {devices.length > 0 && (
            <ul className={styles.deviceList}>
              {devices.map((device, index) => (
                <motion.li
                  key={`${device}-${index}`}
                  className={styles.deviceRow}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <span className={styles.deviceBullet} />
                  <span className={styles.deviceName}>{device}</span>
                  <span className={styles.deviceTag}>registered</span>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.section>

        {/* ---------- Bluetooth ---------- */}
        <motion.section className={styles.section} variants={rowIn}>
          <header className={styles.sectionHead}>
            <h2>ESP32 over Bluetooth</h2>
            <p>Pair directly with a nearby microcontroller for local control.</p>
          </header>

          <div className={styles.rowList}>
            <div className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>
                  {bluetoothDevice ? bluetoothDevice.name ?? 'ESP32' : 'Not connected'}
                </span>
                <span className={styles.rowHint}>
                  {bluetoothDevice
                    ? 'Paired successfully over Bluetooth'
                    : 'Tap connect to search for nearby ESP32 devices'}
                </span>
              </div>

              <div className={styles.statusRow}>
                <span
                  className={styles.statusDot}
                  data-on={!!bluetoothDevice}
                  aria-hidden
                />
                <button
                  onClick={connectToDevice}
                  className={`${styles.ghostBtn} ${bluetoothDevice ? styles.ghostBtnDisabled : ''}`}
                  disabled={bluetoothDevice !== null}
                >
                  {bluetoothDevice ? 'Connected' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ---------- Session ---------- */}
        <motion.section className={`${styles.section} ${styles.danger}`} variants={rowIn}>
          <header className={styles.sectionHead}>
            <h2>Session</h2>
            <p>Sign out of this device. You'll need to log back in to continue.</p>
          </header>

          <div className={styles.rowList}>
            <div className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>Sign out</span>
                <span className={styles.rowHint}>Ends your current session</span>
              </div>
              <button onClick={handleSignOut} className={styles.dangerBtn}>
                <img
                  src={`https://api.iconify.design/mdi:logout.svg?color=%23c96442`}
                  alt="" width={14} height={14}
                />
                Sign out
              </button>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
