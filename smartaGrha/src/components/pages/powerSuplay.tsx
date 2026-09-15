// frontend/src/components/pages/powerSuplay.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
  type Variants,
} from 'framer-motion';
import styles from '../pagesmodulecss/powerSuplay.module.css';
import {
  getPowerEntries,
  getRoomPowers,
  getDeviceStatuses,
} from '../../services/api';

/* --------------------------------------------------------------
   Types
   -------------------------------------------------------------- */
type PowerEntry = { time_bucket: string; power_consumed: number };
type RoomPower = { room_name: string; power_consumed: number };
type DeviceStatus = {
  room_name: string;
  device_name: string;
  power_consumed: number;
  status: 'Active' | 'Inactive' | 'Not Started';
};

type Range = 'day' | 'week' | 'month' | 'year';

interface PowerSuplayProps {
  darkMode: boolean;
}

/* --------------------------------------------------------------
   Easing + variants
   -------------------------------------------------------------- */
const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/* --------------------------------------------------------------
   Animated count-up
   -------------------------------------------------------------- */
const AnimatedNumber: React.FC<{ value: number; decimals?: number }> = ({
  value,
  decimals = 1,
}) => {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 20, mass: 0.8 });
  const text = useTransform(spring, (v) => v.toFixed(decimals));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: EASE_OUT });
    return () => controls.stop();
  }, [value, mv]);

  return <motion.span>{text}</motion.span>;
};

/* --------------------------------------------------------------
   Custom tooltip
   -------------------------------------------------------------- */
const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>
        {label ?? payload[0]?.payload?.name}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} className={styles.tooltipRow}>
          <span
            className={styles.tooltipDot}
            style={{ background: p.color || p.fill }}
          />
          <span className={styles.tooltipName}>
            {p.name === 'power' ? 'Usage' : p.name}
          </span>
          <span className={styles.tooltipValue}>
            {Number(p.value).toFixed(1)} kWh
          </span>
        </div>
      ))}
    </div>
  );
};

/* --------------------------------------------------------------
   Status pill
   -------------------------------------------------------------- */
const StatusPill: React.FC<{ status: DeviceStatus['status'] }> = ({
  status,
}) => {
  const cls =
    status === 'Active'
      ? styles.statusActive
      : status === 'Not Started'
      ? styles.statusNotStarted
      : styles.statusInactive;

  return (
    <span className={`${styles.statusPill} ${cls}`}>
      <span className={styles.pillDot} />
      {status}
    </span>
  );
};

/* ==============================================================
   Page
   ============================================================== */
const PowerSuplay: React.FC<PowerSuplayProps> = ({ darkMode }) => {
  const [powerData, setPowerData] = useState<PowerEntry[]>([]);
  const [roomPowerData, setRoomPowerData] = useState<RoomPower[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus[]>([]);
  const [totalPower, setTotalPower] = useState(0);
  const [timeRange, setTimeRange] = useState<Range>('day');
  const [loading, setLoading] = useState(true);

  /* ---- Chart palette pulled from CSS vars via theme ---- */
  const chartColors = useMemo(
    () =>
      darkMode
        ? ['#e07856', '#8fb098', '#e0b562', '#a785ad', '#7fa3c0', '#cf8a99', '#9aad7c']
        : ['#c96442', '#6b8e78', '#c19a3e', '#8c6a8e', '#5b7a94', '#b06b7a', '#7a8a5c'],
    [darkMode]
  );
  const chartGrid = darkMode
    ? 'rgba(240,237,231,0.06)'
    : 'rgba(23,22,20,0.06)';
  const chartAxis = darkMode ? '#7d7871' : '#8a8681';

  /* ---- Fetch ---- */
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [powerRes, roomRes, deviceRes] = await Promise.all([
          getPowerEntries(timeRange),
          getRoomPowers(),
          getDeviceStatuses(),
        ]);
        if (cancelled) return;

        setPowerData(powerRes.data.powerData || []);
        setRoomPowerData(roomRes.data.roomPowerData || []);
        setDeviceStatus(deviceRes.data.deviceStatus || []);

        const total = (roomRes.data.roomPowerData || []).reduce(
          (sum: number, r: RoomPower) => sum + r.power_consumed,
          0
        );
        setTotalPower(total);
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching power data:', err);
        generateMockData();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  /* ---- Mock fallback ---- */
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

    setPowerData(mockPowerData);
    setRoomPowerData(mockRoomPowerData);
    setDeviceStatus(mockDeviceStatus);
    setTotalPower(mockRoomPowerData.reduce((s, r) => s + r.power_consumed, 0));
  };

  /* ---- Derived data ---- */
  const barData = useMemo(
    () =>
      powerData.map((entry) => ({
        date: format(
          new Date(entry.time_bucket),
          timeRange === 'day'
            ? 'HH:mm'
            : timeRange === 'year'
            ? 'MMM yyyy'
            : 'dd MMM'
        ),
        power: entry.power_consumed,
      })),
    [powerData, timeRange]
  );

  const pieData = useMemo(
    () =>
      roomPowerData.map((entry) => ({
        name: entry.room_name,
        value: entry.power_consumed,
      })),
    [roomPowerData]
  );

  const activeDevices = deviceStatus.filter((d) => d.status === 'Active').length;
  const peakLoad = barData.reduce((m, d) => Math.max(m, d.power), 0);
  const avgLoad =
    barData.length > 0
      ? barData.reduce((s, d) => s + d.power, 0) / barData.length
      : 0;

  /* Delta is computed from the last vs previous point.
     Real apps would use a dedicated endpoint — this is honest enough. */
  const delta = useMemo(() => {
    if (barData.length < 2) return 0;
    const last = barData[barData.length - 1].power;
    const prev = barData[barData.length - 2].power;
    if (prev === 0) return 0;
    return ((last - prev) / prev) * 100;
  }, [barData]);

  const maxRoom = useMemo(
    () => Math.max(1, ...pieData.map((d) => d.value)),
    [pieData]
  );

  const RANGES: Range[] = ['day', 'week', 'month', 'year'];

  return (
    <motion.div
      className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ---------------- Header ---------------- */}
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <div>
          <h2 className={styles.title}>Power Supply Dashboard</h2>
          <p className={styles.subtitle}>
            Consumption across rooms, devices, and time.
          </p>
        </div>

        {/* Segmented control with sliding indicator */}
        <div className={styles.controls} role="tablist" aria-label="Time range">
          {RANGES.map((range) => {
            const isActive = timeRange === range;
            return (
              <button
                key={range}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.button} ${isActive ? styles.active : ''}`}
                onClick={() => setTimeRange(range)}
              >
                {isActive && (
                  <motion.span
                    layoutId="powerSegmentPill"
                    className={styles.buttonIndicator}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 34,
                    }}
                  />
                )}
                {range.toUpperCase()}
              </button>
            );
          })}
        </div>
      </motion.header>

      {/* ---------------- Loading skeleton ---------------- */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            className={styles.skeletonWrap}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className={styles.skeletonBlock} />
            <div className={`${styles.skeletonBlock} ${styles.tall}`} />
            <div className={styles.skeletonBlock} />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* ---------------- Hero stat ---------------- */}
            <motion.section
              className={styles.heroStat}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <div className={styles.heroLeft}>
                <span className={styles.heroLabel}>Total consumption</span>
                <div className={styles.heroValue}>
                  <AnimatedNumber value={totalPower} decimals={2} />
                  <span className={styles.heroUnit}>kWh</span>
                </div>
                <span
                  className={`${styles.heroDelta} ${
                    delta >= 0 ? styles.heroDeltaUp : styles.heroDeltaDown
                  }`}
                >
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% vs
                  previous
                </span>
              </div>

              <div className={styles.heroRight}>
                <div className={styles.heroStatLine}>
                  <span className={styles.heroStatLabel}>Peak load</span>
                  <span className={styles.heroStatValue}>
                    <AnimatedNumber value={peakLoad} decimals={1} /> kWh
                  </span>
                </div>
                <div className={styles.heroStatLine}>
                  <span className={styles.heroStatLabel}>Average load</span>
                  <span className={styles.heroStatValue}>
                    <AnimatedNumber value={avgLoad} decimals={1} /> kWh
                  </span>
                </div>
                <div className={styles.heroStatLine}>
                  <span className={styles.heroStatLabel}>Rooms tracked</span>
                  <span className={styles.heroStatValue}>
                    <AnimatedNumber value={pieData.length} decimals={0} />
                  </span>
                </div>
                <div className={styles.heroStatLine}>
                  <span className={styles.heroStatLabel}>Devices active</span>
                  <span className={styles.heroStatValue}>
                    <AnimatedNumber value={activeDevices} decimals={0} /> /{' '}
                    {deviceStatus.length}
                  </span>
                </div>
              </div>
            </motion.section>

            {/* ---------------- Charts ---------------- */}
            <motion.section
              className={styles.charts}
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {/* Bar chart */}
              <motion.div className={styles.chartBox} variants={fadeUp}>
                <div className={styles.chartHeader}>
                  <h3 className={styles.chartTitle}>
                    Usage over time
                  </h3>
                  <span className={styles.chartMeta}>
                    {timeRange.toUpperCase()}
                  </span>
                </div>
                <div className={styles.chartBody}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={barData}
                      margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke={chartGrid}
                        strokeDasharray="3 6"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: chartAxis, fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: chartGrid }}
                        dy={6}
                      />
                      <YAxis
                        tick={{ fill: chartAxis, fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: 'rgba(201,100,66,0.06)' }}
                      />
                      <Bar
                        dataKey="power"
                        fill={chartColors[0]}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={44}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Pie chart */}
              <motion.div className={styles.chartBox} variants={fadeUp}>
                <div className={styles.chartHeader}>
                  <h3 className={styles.chartTitle}>By room</h3>
                  <span className={styles.chartMeta}>
                    {pieData.length} rooms
                  </span>
                </div>
                <div className={styles.chartBody}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={104}
                        paddingAngle={2}
                        stroke={darkMode ? '#1a1917' : '#fbf9f5'}
                        strokeWidth={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={chartColors[i % chartColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </motion.section>

            {/* ---------------- Breakdown ---------------- */}
            <motion.section
              className={styles.summary}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <h4>Breakdown by room</h4>
              <div className={styles.breakdownList}>
                {pieData.map((entry, index) => {
                  const pct =
                    totalPower > 0 ? (entry.value / totalPower) * 100 : 0;
                  const widthPct = (entry.value / maxRoom) * 100;
                  return (
                    <motion.div
                      key={entry.name}
                      className={styles.breakdownRow}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.05 * index,
                        ease: EASE_OUT,
                      }}
                    >
                      <span className={styles.breakdownName}>{entry.name}</span>
                      <div className={styles.breakdownBar}>
                        <motion.span
                          className={styles.breakdownBarFill}
                          style={{
                            background:
                              chartColors[index % chartColors.length],
                          }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: widthPct / 100 }}
                          transition={{
                            duration: 0.9,
                            delay: 0.15 + 0.05 * index,
                            ease: EASE_OUT,
                          }}
                        />
                      </div>
                      <span className={styles.breakdownPercent}>
                        {pct.toFixed(1)}%
                      </span>
                      <span className={styles.breakdownValue}>
                        {entry.value.toFixed(1)} kWh
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <div className={styles.breakdownTotal}>
                <span>Total</span>
                <span className={styles.breakdownTotalValue}>
                  <AnimatedNumber value={totalPower} decimals={2} /> kWh
                </span>
              </div>
            </motion.section>

            {/* ---------------- Device status table ---------------- */}
            <motion.section
              className={styles.deviceStatus}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <h4>Device status</h4>
              <table className={styles.statusTable}>
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Device</th>
                    <th style={{ textAlign: 'right' }}>Power (kWh)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceStatus.map((status, index) => (
                    <motion.tr
                      key={`${status.room_name}-${status.device_name}-${index}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.03 * index,
                        ease: EASE_OUT,
                      }}
                    >
                      <td>{status.room_name}</td>
                      <td>{status.device_name}</td>
                      <td className={styles.num}>
                        {status.power_consumed.toFixed(2)}
                      </td>
                      <td>
                        <StatusPill status={status.status} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PowerSuplay;
