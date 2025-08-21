import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import {
  FaEllipsisH,
  FaBed,
  FaBath,
  FaUtensils,
  FaCouch,
  FaBox,
  FaBriefcase,
  FaBook,
  FaHome,
  FaLightbulb,
  FaFan,
  FaTv,
  FaDesktop,
  FaWifi,
  FaVolumeUp,
  FaFilm,
  FaPlug,
  FaBlender,
} from 'react-icons/fa';
import { MdAcUnit, MdKitchen, MdMicrowave } from 'react-icons/md';
import { WiHumidity, WiThermometer } from 'react-icons/wi';
import { GiWashingMachine, GiHairStrands } from 'react-icons/gi'; // ✅ replaced HairDryer
import { TbAirConditioning } from 'react-icons/tb'; // ✅ removed AirPurifier
import styles from '../pagesmodulecss/deviceData.module.css';
import { getRooms, getLatestSensorData } from '../../services/api'; // ✅ removed updateDevice

const socket = io(import.meta.env.VITE_WEBSOCKET_URL, { withCredentials: true });

interface Device {
  _id: string;
  type: string;
  relay_no: number;
  is_on: boolean;
}

interface Room {
  _id: string;
  name: string;
  device_id: string;
  temperature: number | null;
  humidity: number | null;
  devices: Device[];
}

interface DeviceDataProps {
  darkMode: boolean;
}

const DeviceData: React.FC<DeviceDataProps> = ({ darkMode }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [newDeviceName, setNewDeviceName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const deviceIcons = [
    FaLightbulb,
    FaFan,
    FaTv,
    MdAcUnit,
    MdKitchen,
    FaDesktop,
    FaWifi,
    FaVolumeUp,
    FaFilm,
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const roomsResponse = await getRooms();
      const formattedRooms: Room[] = await Promise.all(
        roomsResponse.data.rooms.map(async (room: any) => {
          let temperature: number | null = null;
          let humidity: number | null = null;
          try {
            const sensorResponse = await getLatestSensorData(room.device_id);
            if (sensorResponse.data.success && sensorResponse.data.sensorData) {
              temperature = sensorResponse.data.sensorData.temperature;
              humidity = sensorResponse.data.sensorData.humidity;
            }
          } catch (err) {
            console.warn(`No sensor data for device_id: ${room.device_id}`);
          }
          return {
            _id: room._id,
            name: room.name,
            device_id: room.device_id,
            temperature,
            humidity,
            devices: room.devices.map((device: any) => ({
              _id: device._id,
              type: device.type,
              relay_no: device.relay_no,
              is_on: device.is_on,
            })),
          };
        })
      );
      setRooms(formattedRooms);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch rooms');
      if (err.response?.data?.message.includes('Not authorized')) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    socket.on('connect', () => {
      console.log('Socket.IO connected with ID:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
      setError('Failed to connect to real-time updates');
    });

    socket.on('sensorData', (data: { device_id: string; temperature: number; humidity: number }) => {
      console.log('Received sensorData:', data);
      if (
        typeof data.device_id !== 'string' ||
        typeof data.temperature !== 'number' ||
        typeof data.humidity !== 'number' ||
        isNaN(data.temperature) ||
        isNaN(data.humidity)
      ) {
        console.error('Invalid sensorData payload:', data);
        return;
      }
      setRooms((prev) =>
        prev.map((room) =>
          room.device_id === data.device_id
            ? { ...room, temperature: data.temperature, humidity: data.humidity }
            : room
        )
      );
    });

    socket.on('deviceUpdated', (data: { roomId: string; device: Device }) => {
      setRooms((prev) =>
        prev.map((room) =>
          room._id === data.roomId
            ? {
                ...room,
                devices: room.devices.map((d) =>
                  d.relay_no === data.device.relay_no ? data.device : d
                ),
              }
            : room
        )
      );
    });

    socket.on('roomAdded', (data: { room: Room }) => {
      setRooms((prev) => [...prev, data.room]);
    });

    socket.on('roomUpdated', (data: { room: Room }) => {
      setRooms((prev) =>
        prev.map((r) => (r._id === data.room._id ? data.room : r))
      );
    });

    socket.on('roomDeleted', (data: { roomId: string }) => {
      setRooms((prev) => prev.filter((r) => r._id !== data.roomId));
    });

    socket.on('deviceAdded', (data: { roomId: string; device: Device }) => {
      setRooms((prev) =>
        prev.map((r) =>
          r._id === data.roomId
            ? { ...r, devices: [...r.devices, data.device] }
            : r
        )
      );
    });

    socket.on('deviceDeleted', (data: { relay_no: number }) => {
      setRooms((prev) =>
        prev.map((r) => ({
          ...r,
          devices: r.devices.filter((d) => d.relay_no !== data.relay_no),
        }))
      );
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('sensorData');
      socket.off('deviceUpdated');
      socket.off('roomAdded');
      socket.off('roomUpdated');
      socket.off('roomDeleted');
      socket.off('deviceAdded');
      socket.off('deviceDeleted');
    };
  }, []);

  const getRoomIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('bed')) return <FaBed className={styles.roomIcon} />;
    if (lower.includes('bath')) return <FaBath className={styles.roomIcon} />;
    if (lower.includes('kitchen')) return <FaUtensils className={styles.roomIcon} />;
    if (lower.includes('hall') || lower.includes('living')) return <FaCouch className={styles.roomIcon} />;
    if (lower.includes('store')) return <FaBox className={styles.roomIcon} />;
    if (lower.includes('office')) return <FaBriefcase className={styles.roomIcon} />;
    if (lower.includes('study')) return <FaBook className={styles.roomIcon} />;
    return <FaHome className={styles.roomIcon} />;
  };

  const handleEditDevice = (roomId: string, deviceId: string) => {
    const room = rooms.find((r) => r._id === roomId);
    const device = room?.devices.find((d) => d._id === deviceId);
    if (device) {
      setEditingDevice(device._id);
      setNewDeviceName(device.type);
    }
  };

  const handleSaveDevice = async (roomId: string, deviceId: string) => {
    try {
      const room = rooms.find((r) => r._id === roomId);
      const device = room?.devices.find((d) => d._id === deviceId);
      if (!device) throw new Error('Device not found');

      setEditingDevice(null);
      setNewDeviceName('');
      await fetchData();
    } catch (error: any) {
      setError(error.message || 'Error updating device');
      console.error('Error updating device:', error);
    }
  };

  const totalRooms = rooms.length;
  const totalDevices = rooms.reduce((sum, room) => sum + room.devices.length, 0);
  const devicesOn = rooms.reduce(
    (sum, room) => sum + room.devices.filter((d) => d.is_on).length,
    0
  );

  // ✅ Fixed Device Icon Mapping
  const getDeviceIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('light')) return <FaLightbulb className={styles.deviceIcon} />;
    if (lower.includes('fan')) return <FaFan className={styles.deviceIcon} />;
    if (lower.includes('ac') || lower.includes('air conditioner')) return <TbAirConditioning className={styles.deviceIcon} />;
    if (lower.includes('tv')) return <FaTv className={styles.deviceIcon} />;
    if (lower.includes('washing')) return <GiWashingMachine className={styles.deviceIcon} />;
    if (lower.includes('fridge') || lower.includes('refrigerator')) return <MdKitchen className={styles.deviceIcon} />;
    if (lower.includes('hairdryer') || lower.includes('hair dryer')) return <GiHairStrands className={styles.deviceIcon} />;
    if (lower.includes('juicer')) return <FaBlender className={styles.deviceIcon} />;
    if (lower.includes('microwave')) return <MdMicrowave className={styles.deviceIcon} />;
    if (lower.includes('wifi') || lower.includes('wi-fi')) return <FaWifi className={styles.deviceIcon} />;
    if (lower.includes('socket') || lower.includes('plug')) return <FaPlug className={styles.deviceIcon} />;

    // Default icon
    return <FaDesktop className={styles.deviceIcon} />;
  };

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
      <div className={styles.background}>
        {Array.from({ length: 15 }).map((_, i) => {
          const Icon = deviceIcons[Math.floor(Math.random() * deviceIcons.length)];
          const left = Math.random() * 100;
          const top = Math.random() * 100;
          const duration = 5 + Math.random() * 5;
          const delay = Math.random() * 2;
          return (
            <motion.div
              key={i}
              className={styles.floatingIcon}
              style={{ left: `${left}%`, top: `${top}%` }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                y: [0, -15, 0],
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration,
                delay,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }}
              whileHover={{
                scale: 1.2,
                rotate: 0,
                transition: { duration: 0.3 },
              }}
            >
              <Icon />
            </motion.div>
          );
        })}
      </div>
      <h1 className={styles.title}>Monitoring Room Device Data</h1>
      <div className={styles.summary}>
        <p>Total Rooms: {totalRooms}</p>
        <p>Total Devices: {totalDevices}</p>
        <p>Devices On: {devicesOn}</p>
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={styles.error}
        >
          {error}
        </motion.p>
      )}
      {loading ? (
        <p>Loading...🕹🛸🔥</p>
      ) : (
        <AnimatePresence>
          {rooms.map((room) => (
            <motion.div
              key={room._id}
              className={styles.roomContainer}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <div className={styles.roomHeader}>
                <h2 className={styles.roomTitle}>
                  {getRoomIcon(room.name)}
                  {room.name}
                </h2>
              </div>

              <div className={styles.statusContainer}>
                <div className={styles.statusBox}>
                  <WiThermometer className={styles.icon} />
                  <p>Temperature: {room.temperature ?? 'N/A'}°C</p>
                </div>
                <div className={styles.statusBox}>
                  <WiHumidity className={styles.icon} />
                  <p>Humidity: {room.humidity ?? 'N/A'}%</p>
                </div>
                <p className={styles.statusBoxpp}>Devices in Room: {room.devices.length}</p>
              </div>

              <div className={styles.devicesGrid}>
                {room.devices.map((device) => (
                  <motion.div
                    key={device._id}
                    className={`${styles.deviceCard} ${device.is_on ? styles.on : styles.off}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    {editingDevice === device._id ? (
                      <>
                        <input
                          type="text"
                          value={newDeviceName}
                          onChange={(e) => setNewDeviceName(e.target.value)}
                          className={styles.input}
                          placeholder="Device Name"
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={styles.saveButton}
                          onClick={() => handleSaveDevice(room._id, device._id)}
                        >
                          Save
                        </motion.button>
                      </>
                    ) : (
                      <>
                        <div className={styles.deviceInfo}>
                          {getDeviceIcon(device.type)}
                          <p>
                            {device.type} (Relay {device.relay_no}): {device.is_on ? 'ON' : 'OFF'}
                          </p>
                        </div>
                        <FaEllipsisH
                          className={styles.editIcon}
                          onClick={() => handleEditDevice(room._id, device._id)}
                        />
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};

export default DeviceData;
