import React, { useState } from 'react';
import styles from '../pagesmodulecss/settings.module.css';


interface SettingsPageProps {
  darkMode: boolean;
  onToggleDarkMode: (newMode: boolean) => void;
  handleSignOut: () => void;
}

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

  return (
    <div className={styles.settingsContainer}>
      <h1 className={styles.heading}>Settings</h1>

      <div className={styles.section}>
        <h2 className={styles.subheading}>Notifications</h2>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={() => setNotificationsEnabled(!notificationsEnabled)}
          />
          <span className={styles.slider}></span>
        </label>
      </div>

      <div className={styles.section}>
        <h2 className={styles.subheading}>Dark Mode</h2>
        <button
          className={styles.toggleButton}
          onClick={() => onToggleDarkMode(!darkMode)}
        >
          {darkMode ? 'Disable Dark Mode' : 'Enable Dark Mode'}
        </button>
      </div>

      <div className={styles.section}>
        <h2 className={styles.subheading}>Sign Out</h2>
        <button onClick={handleSignOut} className={styles.signOutButton}>
          Sign Out
        </button>
      </div>

      <div className={styles.section}>
        <h2 className={styles.subheading}>Add New Device</h2>
        <form onSubmit={handleAddDevice} className={styles.deviceForm}>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Device Name"
            className={styles.deviceInput}
          />
          <button type="submit" className={styles.addButton}>
            Add Device
          </button>
        </form>
        <ul className={styles.deviceList}>
          {devices.map((device, index) => (
            <li key={index} className={styles.deviceItem}>
              {device}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.section}>
        <h2 className={styles.subheading}>ESP32 Bluetooth</h2>
        <button
          onClick={connectToDevice}
          className={styles.bluetoothButton}
          disabled={bluetoothDevice !== null}
        >
          {bluetoothDevice ? 'Connected to ESP32' : 'Connect to ESP32'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
