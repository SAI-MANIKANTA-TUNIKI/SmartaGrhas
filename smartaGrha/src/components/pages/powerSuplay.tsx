// src/Components/pages/PowerSuplay.tsx
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';
import styles from '../pagesmodulecss/powerSuplay.module.css';
import { motion, type Variants } from 'framer-motion';
import { getPowerEntries, getRoomPowers, getDeviceStatuses } from '../../services/api';

type PowerEntry = { time_bucket: string; power_consumed: number; };
type RoomPower = { room_name: string; power_consumed: number; };
type DeviceStatus = {
  room_name: string; device_name: string;
  power_consumed: number;
  status: 'Active' | 'Inactive' | 'Not Started';
};

const COLORS = ['#c96442', '#5c8068', '#8a8681', '#d9a878', '#7c8aa5', '#b4afa7'];

interface PowerSuplayProps { darkMode: boolean; }

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

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
      const total = roomRes.data.roomPowerData.reduce(
        (sum: number, r: RoomPower) => sum + r.power_consumed, 0
      );
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
    date: format(
      new Date(entry.time_bucket),
      timeRange === 'day' ? 'HH:mm' : timeRange === 'year' ? 'MMM yyyy' : 'dd/MM'
    ),
    power: entry.power_consumed,
  }));

  const pieData = roomPowerData.map((entry) => ({
    name: entry.room_name,
    value: entry.power_consumed,
  }));

  const tooltipStyle = {
    backgroundColor: darkMode ? '#1a1917' : '#0e0e0c',
    border: `1px solid ${darkMode ? '#3a3733' : '#26241f'}`,
    borderRadius: 8,
    padding: '8px 10px',
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#f0ede7',
  } as const;

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>Energy · Supply</p>
          <h1 className={styles.title}>Power consumption</h1>
        </div>

        <div className={styles.rangePicker} role="tablist">
          {(['day', 'week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              type="button"
              role="tab"
              aria-selected={timeRange === range}
              className={`${styles.rangeBtn} ${timeRange === range ? styles.rangeBtnActive : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <motion.div
        className={styles.stack}
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* ---------- Total + bar chart ---------- */}
        <motion.section className={styles.heroRow} variants={fadeUp}>
          <div className={styles.totalCard}>
            <p className={styles.statLabel}>Total usage</p>
            <div className={styles.statValueRow}>
              <span className={styles.statValue}>{totalPower.toFixed(2)}</span>
              <span className={styles.statUnit}>kWh</span>
            </div>
            <p className={styles.trend} data-dir={totalPower > 200 ? 'up' : 'down'}>
              <span className={styles.trendArrow}>{totalPower > 200 ? '↑' : '↓'}</span>
              {totalPower > 200 ? '12%' : '4%'} vs previous {timeRange}
            </p>
            <p className={styles.statHint}>
              Aggregated across {roomPowerData.length} rooms
            </p>
          </div>

          <div className={styles.chartCard}>
            <header className={styles.sectionHead}>
              <h2>Usage over time</h2>
              <span className={styles.monoHint}>{timeRange}</span>
            </header>
            <div className={styles.barWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid
                    vertical={false}
                    stroke={darkMode ? 'rgba(240,237,231,0.06)' : 'rgba(23,22,20,0.06)'}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: darkMode ? '#7d7871' : '#8a8681', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: darkMode ? '#7d7871' : '#8a8681', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="power" fill={darkMode ? '#e07856' : '#c96442'} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.section>

        {/* ---------- Room breakdown ---------- */}
        <motion.section className={styles.split} variants={fadeUp}>
          <div className={styles.chartCard}>
            <header className={styles.sectionHead}>
              <h2>By room</h2>
              <span className={styles.monoHint}>Share of total</span>
            </header>
            <div className={styles.pieWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                    stroke={darkMode ? '#1a1917' : '#ffffff'}
                    strokeWidth={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ color: darkMode ? '#b6b1a8' : '#4a4844', fontSize: 11 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.breakdown}>
            <header className={styles.sectionHead}>
              <h2>Breakdown</h2>
              <span className={styles.monoHint}>kWh · %</span>
            </header>
            <ul className={styles.breakdownList}>
              {pieData.map((entry, i) => {
                const pct = totalPower > 0 ? (entry.value / totalPower) * 100 : 0;
                return (
                  <li key={entry.name} className={styles.breakdownItem}>
                    <span
                      className={styles.breakdownSwatch}
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className={styles.breakdownName}>{entry.name}</span>
                    <span className={styles.breakdownValue}>
                      {entry.value.toFixed(2)}
                      <span className={styles.breakdownUnit}>kWh</span>
                    </span>
                    <span className={styles.breakdownPct}>{pct.toFixed(1)}%</span>
                    <span className={styles.breakdownBar} aria-hidden>
                      <motion.span
                        className={styles.breakdownBarFill}
                        style={{ background: COLORS[i % COLORS.length] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.15 + i * 0.05 }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.section>

        {/* ---------- Device table ---------- */}
        <motion.section className={styles.tableCard} variants={fadeUp}>
          <header className={styles.sectionHead}>
            <h2>Device status</h2>
            <span className={styles.monoHint}>{deviceStatus.length} devices</span>
          </header>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Device</th>
                  <th className={styles.right}>Power</th>
                  <th className={styles.right}>Status</th>
                </tr>
              </thead>
              <tbody>
                {deviceStatus.map((s, i) => (
                  <tr key={i}>
                    <td className={styles.mutedCell}>{s.room_name}</td>
                    <td>{s.device_name}</td>
                    <td className={styles.right + ' ' + styles.monoCell}>
                      {s.power_consumed.toFixed(2)}<span className={styles.tdUnit}> kWh</span>
                    </td>
                    <td className={styles.right}>
                      <span className={styles.statusPill} data-status={s.status.replace(' ', '-').toLowerCase()}>
                        <span className={styles.statusDot} />
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default PowerSuplay;
