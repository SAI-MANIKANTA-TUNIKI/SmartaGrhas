// frontend/src/components/pages/powerSuplay.tsx
import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import styles from '../pagesmodulecss/powerSuplay.module.css';
import { motion } from 'framer-motion';
import {
  getPowerEntries,
  getRoomPowers,
  getDeviceStatuses,
} from '../../services/api';

type PowerEntry = {
  time_bucket: string;
  power_consumed: number;
};

type RoomPower = {
  room_name: string;
  power_consumed: number;
};

type DeviceStatus = {
  room_name: string;
  device_name: string;
  power_consumed: number;
  status: 'Active' | 'Inactive' | 'Not Started';
};

const COLORS = [
  '#c96442',
  '#6b8e78',
  '#c19a3e',
  '#8c6a8e',
  '#5b7a94',
  '#b06b7a',
  '#7a8a5c',
];

interface PowerSuplayProps {
  darkMode: boolean;
}

const PowerSuplay: React.FC<PowerSuplayProps> = ({ darkMode }) => {
  const [powerData, setPowerData] = useState<PowerEntry[]>([]);
  const [roomPowerData, setRoomPowerData] = useState<RoomPower[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus[]>([]);
  const [totalPower, setTotalPower] = useState<number>(0);
  const [timeRange, setTimeRange] = useState<
    'day' | 'week' | 'month' | 'year'
  >('day');

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const powerRes = await getPowerEntries(timeRange);
      setPowerData(powerRes.data.powerData || []);

      const roomRes = await getRoomPowers();
      setRoomPowerData(roomRes.data.roomPowerData || []);

      const deviceRes = await getDeviceStatuses();
      setDeviceStatus(deviceRes.data.deviceStatus || []);

      const total = roomRes.data.roomPowerData.reduce(
        (sum: number, r: RoomPower) => sum + r.power_consumed,
        0
      );

      setTotalPower(total);
    } catch (error) {
      console.error('Error fetching power data:', error);
      generateMockData();
    }
  };

  const generateMockData = () => {
    const mockPowerData: PowerEntry[] = Array.from(
      { length: 7 },
      (_, i) => ({
        time_bucket: new Date(
          Date.now() - i * 3600 * 1000
        ).toISOString(),
        power_consumed: Math.floor(Math.random() * 30) + 20,
      })
    ).reverse();

    const mockRoomPowerData: RoomPower[] = [
      {
        room_name: 'Living Room',
        power_consumed: 120,
      },
      {
        room_name: 'Kitchen',
        power_consumed: 90,
      },
      {
        room_name: 'Bedroom',
        power_consumed: 60,
      },
      {
        room_name: 'Bathroom',
        power_consumed: 30,
      },
    ];

    const mockDeviceStatus: DeviceStatus[] = [
      {
        room_name: 'Living Room',
        device_name: 'TV',
        power_consumed: 40,
        status: 'Active',
      },
      {
        room_name: 'Kitchen',
        device_name: 'Refrigerator',
        power_consumed: 50,
        status: 'Active',
      },
      {
        room_name: 'Bedroom',
        device_name: 'Fan',
        power_consumed: 20,
        status: 'Inactive',
      },
      {
        room_name: 'Bathroom',
        device_name: 'Heater',
        power_consumed: 15,
        status: 'Not Started',
      },
    ];

    const total = mockRoomPowerData.reduce(
      (sum, r) => sum + r.power_consumed,
      0
    );

    setPowerData(mockPowerData);
    setRoomPowerData(mockRoomPowerData);
    setDeviceStatus(mockDeviceStatus);
    setTotalPower(total);
  };

  const barData = powerData.map((entry) => ({
    date: format(
      new Date(entry.time_bucket),
      timeRange === 'day'
        ? 'HH:mm'
        : timeRange === 'year'
        ? 'MMM yyyy'
        : 'dd/MM'
    ),
    power: entry.power_consumed,
  }));

  const pieData = roomPowerData.map((entry) => ({
    name: entry.room_name,
    value: entry.power_consumed,
  }));

  const activeDevices = deviceStatus.filter(
    (device) => device.status === 'Active'
  ).length;

  const totalDevices = deviceStatus.length;

  const averagePower =
    barData.length > 0
      ? barData.reduce((sum, entry) => sum + entry.power, 0) /
        barData.length
      : 0;

  const usageIncreased = totalPower > 200;

  const getStatusClass = (status: DeviceStatus['status']) => {
    switch (status) {
      case 'Active':
        return styles.statusPill + ' ' + styles.statusActive;

      case 'Inactive':
        return styles.statusPill + ' ' + styles.statusInactive;

      case 'Not Started':
        return styles.statusPill + ' ' + styles.statusNotStarted;

      default:
        return styles.statusPill;
    }
  };

  return (
    <motion.div
      className={`${styles.container} ${
        darkMode ? styles.darkMode : styles.lightMode
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        ease: 'easeOut',
      }}
    >
      {/* =========================================================
          HEADER
         ========================================================= */}
      <div className={styles.header}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h2
            className={styles.title}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            Power Supply Dashboard
          </motion.h2>

          <p className={styles.subtitle}>
            Electricity consumption across rooms and connected devices.
          </p>
        </motion.div>

        {/* Time Range Controls */}
        <div className={styles.controls}>
          {['day', 'week', 'month', 'year'].map((range) => (
            <motion.button
              key={range}
              className={`${styles.button} ${
                timeRange === range ? styles.active : ''
              }`}
              onClick={() =>
                setTimeRange(
                  range as 'day' | 'week' | 'month' | 'year'
                )
              }
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{
                type: 'spring',
                stiffness: 200,
              }}
            >
              {range.toUpperCase()}

              {timeRange === range && (
                <motion.span
                  className={styles.buttonIndicator}
                  layoutId="powerRangeIndicator"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* =========================================================
          HERO STAT
         ========================================================= */}
      <motion.div
        className={styles.heroStat}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.7,
          delay: 0.15,
        }}
      >
        <div className={styles.heroLeft}>
          <span className={styles.heroLabel}>
            Total Energy Consumption
          </span>

          <div className={styles.heroValue}>
            {totalPower.toFixed(2)}
            <span className={styles.heroUnit}>kWh</span>
          </div>

          <div
            className={`${styles.heroDelta} ${
              usageIncreased
                ? styles.heroDeltaUp
                : styles.heroDeltaDown
            }`}
          >
            {usageIncreased
              ? '▲ 12% Increase'
              : '▼ 4% Decrease'}

            <span>from last period</span>
          </div>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.heroStatLine}>
            <span className={styles.heroStatLabel}>
              Selected range
            </span>

            <span className={styles.heroStatValue}>
              {timeRange.toUpperCase()}
            </span>
          </div>

          <div className={styles.heroStatLine}>
            <span className={styles.heroStatLabel}>
              Active devices
            </span>

            <span className={styles.heroStatValue}>
              {activeDevices} / {totalDevices}
            </span>
          </div>

          <div className={styles.heroStatLine}>
            <span className={styles.heroStatLabel}>
              Average reading
            </span>

            <span className={styles.heroStatValue}>
              {averagePower.toFixed(2)} kWh
            </span>
          </div>
        </div>
      </motion.div>

      {/* =========================================================
          CHARTS
         ========================================================= */}
      <div className={styles.charts}>
        {/* Consumption Chart */}
        <motion.div
          className={styles.chartBox}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.2,
          }}
        >
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>
              Consumption Over Time
            </h3>

            <span className={styles.chartMeta}>
              {timeRange} · kWh
            </span>
          </div>

          <div className={styles.chartBody}>
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <BarChart
                data={barData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -10,
                  bottom: 5,
                }}
              >
                <XAxis
                  dataKey="date"
                  stroke="var(--chart-axis)"
                  tick={{
                    fill: 'var(--chart-axis)',
                    fontSize: 11,
                  }}
                  axisLine={{
                    stroke: 'var(--chart-grid)',
                  }}
                  tickLine={false}
                />

                <YAxis
                  stroke="var(--chart-axis)"
                  tick={{
                    fill: 'var(--chart-axis)',
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '9px',
                    color: 'var(--ink)',
                    boxShadow:
                      'var(--shadow-md)',
                  }}
                  labelStyle={{
                    color: 'var(--ink-3)',
                  }}
                  itemStyle={{
                    color: 'var(--ink)',
                  }}
                  cursor={{
                    fill: 'var(--accent-soft)',
                  }}
                />

                <Bar
                  dataKey="power"
                  fill="var(--chart-1)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Room Pie Chart */}
        <motion.div
          className={styles.chartBox}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.3,
          }}
        >
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>
              Power Usage by Room
            </h3>

            <span className={styles.chartMeta}>
              Distribution
            </span>
          </div>

          <div className={styles.chartBody}>
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  innerRadius={55}
                  paddingAngle={2}
                  label
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS[
                          index % COLORS.length
                        ]
                      }
                    />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '9px',
                    color: 'var(--ink)',
                    boxShadow:
                      'var(--shadow-md)',
                  }}
                />

                <Legend
                  wrapperStyle={{
                    color: 'var(--ink-2)',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* =========================================================
          DETAILED BREAKDOWN
         ========================================================= */}
      <motion.div
        className={styles.summary}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.4,
        }}
      >
        <h4>Detailed Breakdown</h4>

        <div className={styles.breakdownList}>
          {pieData.map((entry, index) => {
            const percentage =
              totalPower > 0
                ? (entry.value / totalPower) * 100
                : 0;

            return (
              <motion.div
                key={entry.name}
                className={styles.breakdownRow}
                initial={{
                  opacity: 0,
                  x: -10,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  duration: 0.4,
                  delay:
                    0.45 + index * 0.05,
                }}
              >
                <span
                  className={
                    styles.breakdownName
                  }
                >
                  {entry.name}
                </span>

                <div
                  className={
                    styles.breakdownBar
                  }
                >
                  <motion.div
                    className={
                      styles.breakdownBarFill
                    }
                    style={{
                      width: `${percentage}%`,
                      background:
                        COLORS[
                          index %
                            COLORS.length
                        ],
                    }}
                    initial={{
                      scaleX: 0,
                    }}
                    animate={{
                      scaleX: 1,
                    }}
                    transition={{
                      duration: 0.8,
                      delay:
                        0.5 +
                        index * 0.06,
                      ease: 'easeOut',
                    }}
                  />
                </div>

                <span
                  className={
                    styles.breakdownPercent
                  }
                >
                  {percentage.toFixed(2)}%
                </span>

                <span
                  className={
                    styles.breakdownValue
                  }
                >
                  {entry.value.toFixed(2)} kWh
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className={styles.breakdownTotal}>
          <span>Total Power Usage</span>

          <span
            className={
              styles.breakdownTotalValue
            }
          >
            {totalPower.toFixed(2)} kWh
          </span>
        </div>
      </motion.div>

      {/* =========================================================
          DEVICE STATUS
         ========================================================= */}
      <motion.div
        className={styles.deviceStatus}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.5,
        }}
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
            {deviceStatus.map(
              (status, index) => (
                <motion.tr
                  key={`${status.room_name}-${status.device_name}-${index}`}
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.35,
                    delay:
                      0.55 +
                      index * 0.05,
                  }}
                  whileHover={{
                    scale: 1.01,
                  }}
                >
                  <td>{status.room_name}</td>

                  <td>{status.device_name}</td>

                  <td
                    className={
                      styles.num
                    }
                  >
                    {status.power_consumed.toFixed(
                      2
                    )}
                  </td>

                  <td>
                    <span
                      className={getStatusClass(
                        status.status
                      )}
                    >
                      <span
                        className={
                          styles.pillDot
                        }
                      />

                      {status.status}
                    </span>
                  </td>
                </motion.tr>
              )
            )}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
};

export default PowerSuplay;
