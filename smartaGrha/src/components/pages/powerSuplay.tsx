// File: PowerSuplay.tsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import styles from '../pagesmodulecss/powerSuplay.module.css';
import { motion } from 'framer-motion';
import { getPowerEntries, getRoomPowers, getDeviceStatuses } from '../../services/api';

type PowerEntry = { time_bucket: string; power_consumed: number; };
type RoomPower = { room_name: string; power_consumed: number; };
type DeviceStatus = { room_name: string; device_name: string; power_consumed: number; status: 'Active' | 'Inactive' | 'Not Started'; };

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#a28cff', '#00c49f'];

interface PowerSuplayProps {
  darkMode: boolean;
}

const PowerSuplay: React.FC<PowerSuplayProps> = ({ darkMode }) => {
  const [powerData, setPowerData] = useState<PowerEntry[]>([]);
  const [roomPowerData, setRoomPowerData] = useState<RoomPower[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus[]>([]);
  const [totalPower, setTotalPower] = useState<number>(0);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('day');

  useEffect(() => { fetchData(); }, [timeRange]);

  const fetchData = async () => {
    try {
      const powerRes = await getPowerEntries(timeRange);
      setPowerData(powerRes.data.powerData || []);

      const roomRes = await getRoomPowers();
      setRoomPowerData(roomRes.data.roomPowerData || []);

      const deviceRes = await getDeviceStatuses();
      setDeviceStatus(deviceRes.data.deviceStatus || []);

      const total = roomRes.data.roomPowerData.reduce((sum: number, r: RoomPower) => sum + r.power_consumed, 0);
      setTotalPower(total);
    } catch (error) {
      console.error('Error fetching power data:', error);
      generateMockData();
    }
  };

  const generateMockData = () => {
    const mockPowerData: PowerEntry[] = Array.from({ length: 7 }, (_, i) => ({
      time_bucket: new Date(Date.now() - i * 3600 * 1000).toISOString(),
      power_consumed: Math.floor(Math.random() * 30) + 20,
    })).reverse();

    const mockRoomPowerData: RoomPower[] = [
      { room_name: 'Living Room', power_consumed: 120 },
      { room_name: 'Kitchen', power_consumed: 90 },
      { room_name: 'Bedroom', power_consumed: 60 },
      { room_name: 'Bathroom', power_consumed: 30 },
    ];

    const mockDeviceStatus: DeviceStatus[] = [
      { room_name: 'Living Room', device_name: 'TV', power_consumed: 40, status: 'Active' },
      { room_name: 'Kitchen', device_name: 'Refrigerator', power_consumed: 50, status: 'Active' },
      { room_name: 'Bedroom', device_name: 'Fan', power_consumed: 20, status: 'Inactive' },
      { room_name: 'Bathroom', device_name: 'Heater', power_consumed: 15, status: 'Not Started' },
    ];

    const total = mockRoomPowerData.reduce((sum, r) => sum + r.power_consumed, 0);

    setPowerData(mockPowerData);
    setRoomPowerData(mockRoomPowerData);
    setDeviceStatus(mockDeviceStatus);
    setTotalPower(total);
  };

  const barData = powerData.map((entry) => ({
    date: format(new Date(entry.time_bucket), timeRange === 'day' ? 'HH:mm' : timeRange === 'year' ? 'MMM yyyy' : 'dd/MM'),
    power: entry.power_consumed,
  }));

  const pieData = roomPowerData.map((entry) => ({
    name: entry.room_name,
    value: entry.power_consumed,
  }));

  return (
    <motion.div
      className={darkMode ? styles.darkMode : styles.lightMode}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div className={styles.container}>
        <motion.h2
          className={styles.title}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          🦋 Power Supply Dashboard
        </motion.h2>

        <div className={styles.controls}>
          {['day', 'week', 'month', 'year'].map((range, _i) => (
            <motion.button
              key={range}
              className={`${styles.button} ${timeRange === range ? styles.active : ''}`}
              onClick={() => setTimeRange(range as any)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {range.toUpperCase()}
            </motion.button>
          ))}
        </div>

        <div className={styles.charts}>
          <motion.div
            className={styles.chartBox}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className={styles.totalUsage}>
              <h2>Total Usage</h2>
              <p className={styles.usageValue}>{totalPower.toFixed(2)} kWh</p>
              <p className={styles.usageChange}>
                {totalPower > 200 ? '🔺 12% Increase' : '🔻 8% Decrease'} from last period
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="power" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            className={styles.chartBox}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <h3>Power Usage by Room</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        <motion.div
          className={styles.summary}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h4>Detailed Breakdown</h4>
          {pieData.map((entry, index) => (
            <p key={index}>
              {entry.name}: {totalPower > 0 ? ((entry.value / totalPower) * 100).toFixed(2) : 0}% ({entry.value.toFixed(2)} kWh)
            </p>
          ))}
          <p>Total Power Usage: {totalPower.toFixed(2)} kWh</p>
        </motion.div>

        <motion.div
          className={styles.deviceStatus}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h4>Device Status</h4>
          <table className={styles.statusTable}>
            <thead>
              <tr>
                <th>Room</th>
                <th>Device</th>
                <th>Power Consumed (kWh)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deviceStatus.map((status, index) => (
                <motion.tr
                  key={index}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                  transition={{ duration: 0.3 }}
                >
                  <td>{status.room_name}</td>
                  <td>{status.device_name}</td>
                  <td>{status.power_consumed.toFixed(2)}</td>
                  <td>{status.status}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PowerSuplay;
