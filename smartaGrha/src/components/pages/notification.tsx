// src/Components/Pages/NotificationDashboard.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import io from "socket.io-client";
import styles from "../pagesmodulecss/notification.module.css";
import {
  getNotifications,
  getUserPreferences,
  updateUserPreferences,
  getUserData,
} from "../../services/api";

const socket = io(import.meta.env.VITE_WEBSOCKET_URL, { withCredentials: true });

interface Notification {
  _id: string;
  dashboard: string;
  eventType: string;
  description: string;
  timestamp: string;
  device_id?: string;
  metadata?: any;
}

interface NotificationDashboardProps {
  darkMode: boolean;
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const listStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const itemIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25 } },
};

/* Map event types to a small icon and a hue for the left rail */
const EVENT_META: Record<string, { icon: string; hue: string }> = {
  DeviceStatus:   { icon: 'mdi:power-plug-outline',   hue: 'var(--accent)' },
  SensorUpdate:   { icon: 'mdi:thermometer-lines',    hue: 'var(--sage)' },
  ScheduleChange: { icon: 'mdi:calendar-clock',       hue: 'var(--ink-3)' },
  MotionDetected: { icon: 'mdi:motion-sensor',        hue: 'var(--accent)' },
  PowerMetric:    { icon: 'mdi:flash-outline',        hue: 'var(--sage)' },
  WeatherUpdate:  { icon: 'mdi:weather-partly-cloudy', hue: 'var(--ink-3)' },
};

const NotificationDashboard: React.FC<NotificationDashboardProps> = ({ darkMode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterDashboard, setFilterDashboard] = useState<string>("");
  const [filterEventType, setFilterEventType] = useState<string>("");
  const [disabledEventTypes, setDisabledEventTypes] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const dashboards = ["DeviceData", "RoomControl", "Camera", "PowerSupply", "Weather"];
  const eventTypes = [
    "DeviceStatus",
    "SensorUpdate",
    "ScheduleChange",
    "MotionDetected",
    "PowerMetric",
    "WeatherUpdate",
  ];

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await getNotifications({
        dashboard: filterDashboard,
        eventType: filterEventType,
        limit: 50,
      });
      setNotifications(response.data.notifications);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch notifications");
      if (err.response?.data?.message.includes("Not authorized")) navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await getUserPreferences();
      const disabled = response.data.disabledEventTypes || [];
      setDisabledEventTypes(disabled);
      localStorage.setItem("disabledEventTypes", JSON.stringify(disabled));
    } catch (err) {
      console.error("Error fetching preferences:", err);
    }
  };

  const handleToggleEventType = async (eventType: string) => {
    const newDisabled = disabledEventTypes.includes(eventType)
      ? disabledEventTypes.filter((type) => type !== eventType)
      : [...disabledEventTypes, eventType];
    setDisabledEventTypes(newDisabled);
    localStorage.setItem("disabledEventTypes", JSON.stringify(newDisabled));
    try {
      await updateUserPreferences(newDisabled);
      fetchNotifications();
    } catch {
      setError("Failed to update preferences");
    }
  };

  useEffect(() => {
    const storedDisabled = localStorage.getItem("disabledEventTypes");
    if (storedDisabled) setDisabledEventTypes(JSON.parse(storedDisabled));
    fetchPreferences();
    fetchNotifications();

    const joinSocketRoom = async () => {
      try {
        const userResponse = await getUserData();
        const userId = userResponse.data.id;
        socket.emit("join", userId);
      } catch (err) {
        console.error("Failed to fetch user data for socket join:", err);
      }
    };

    joinSocketRoom();

    socket.on("connect_error", (err) => {
      setError("Failed to connect to real-time updates");
      console.error("Socket.IO error:", err.message);
    });

    socket.on("notification", (notification: Notification) => {
      if (
        (!filterDashboard || notification.dashboard === filterDashboard) &&
        (!filterEventType || notification.eventType === filterEventType) &&
        !disabledEventTypes.includes(notification.eventType)
      ) {
        setNotifications((prev) => [notification, ...prev].slice(0, 50));
      }
    });

    return () => {
      socket.off("connect_error");
      socket.off("notification");
    };
  }, [filterDashboard, filterEventType]);

  const iconColor = darkMode ? '%23f0ede7' : '%230e0e0c';
  const activeFilterCount = (filterDashboard ? 1 : 0) + (filterEventType ? 1 : 0);

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      {/* ---------- Top bar ---------- */}
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>Activity · Feed</p>
          <h1 className={styles.title}>Notifications</h1>
        </div>

        <button
          type="button"
          className={`${styles.settingsBtn} ${showSettings ? styles.settingsBtnActive : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          aria-expanded={showSettings}
        >
          <img
            src={`https://api.iconify.design/mdi:tune-variant.svg?color=${iconColor}`}
            alt="" width={14} height={14}
          />
          Preferences
          {activeFilterCount > 0 && (
            <span className={styles.badge}>{activeFilterCount}</span>
          )}
        </button>
      </header>

      {/* ---------- Filter strip ---------- */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="filter-dashboard">Dashboard</label>
          <select
            id="filter-dashboard"
            value={filterDashboard}
            onChange={(e) => {
              setFilterDashboard(e.target.value);
              fetchNotifications();
            }}
            className={styles.select}
          >
            <option value="">All</option>
            {dashboards.map((dashboard) => (
              <option key={dashboard} value={dashboard}>{dashboard}</option>
            ))}
          </select>
        </div>

        <span className={styles.filterDivider} aria-hidden />

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="filter-event">Event</label>
          <select
            id="filter-event"
            value={filterEventType}
            onChange={(e) => {
              setFilterEventType(e.target.value);
              fetchNotifications();
            }}
            className={styles.select}
          >
            <option value="">All types</option>
            {eventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>{eventType}</option>
            ))}
          </select>
        </div>

        <span className={styles.filterSpacer} />

        <span className={styles.count}>
          {notifications.length}<span className={styles.countUnit}>items</span>
        </span>
      </div>

      {/* ---------- Preferences panel ---------- */}
      <AnimatePresence initial={false}>
        {showSettings && (
          <motion.section
            className={styles.prefs}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: '1.25rem' }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <div className={styles.prefsInner}>
              <header className={styles.prefsHead}>
                <h2>Muted event types</h2>
                <p>Disable notifications for events you don't need to see.</p>
              </header>

              <div className={styles.prefsGrid}>
                {eventTypes.map((eventType) => {
                  const muted = disabledEventTypes.includes(eventType);
                  return (
                    <button
                      key={eventType}
                      type="button"
                      className={`${styles.prefChip} ${muted ? styles.prefChipMuted : ''}`}
                      onClick={() => handleToggleEventType(eventType)}
                      aria-pressed={muted}
                    >
                      <span className={styles.prefChipDot} />
                      {eventType}
                      {muted && <span className={styles.prefChipMark} aria-hidden>✕</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ---------- Error ---------- */}
      <AnimatePresence>
        {error && (
          <motion.div
            className={styles.errorBanner}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <span className={styles.errorDot} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Loading ---------- */}
      {loading ? (
        <div className={styles.skeletonWrap}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : (
        /* ---------- List ---------- */
        <motion.ul
          className={styles.list}
          initial="hidden"
          animate="visible"
          variants={listStagger}
        >
          <AnimatePresence mode="popLayout">
            {notifications.length === 0 ? (
              <motion.li
                key="empty"
                className={styles.empty}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <img
                  src={`https://api.iconify.design/mdi:bell-sleep-outline.svg?color=${
                    darkMode ? '%237d7871' : '%238a8681'
                  }`}
                  alt="" width={28} height={28}
                />
                <p>Nothing here yet</p>
                <span>New activity will show up as it happens.</span>
              </motion.li>
            ) : (
              notifications.map((notification) => {
                const meta = EVENT_META[notification.eventType] ?? {
                  icon: 'mdi:bell-outline',
                  hue: 'var(--ink-3)',
                };
                return (
                  <motion.li
                    key={notification._id}
                    className={styles.item}
                    variants={itemIn}
                    exit="exit"
                    layout
                    style={{ ['--rail' as any]: meta.hue }}
                  >
                    <span className={styles.rail} aria-hidden />

                    <span className={styles.itemIcon}>
                      <img
                        src={`https://api.iconify.design/${meta.icon}.svg?color=${
                          darkMode ? '%23f0ede7' : '%230e0e0c'
                        }`}
                        alt="" width={16} height={16}
                      />
                    </span>

                    <div className={styles.itemBody}>
                      <div className={styles.itemHead}>
                        <span className={styles.tag}>{notification.dashboard}</span>
                        <span className={styles.event}>{notification.eventType}</span>
                        <span className={styles.dot} aria-hidden>·</span>
                        <time className={styles.time}>
                          {new Date(notification.timestamp).toLocaleString([], {
                            day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </time>
                      </div>

                      <p className={styles.desc}>{notification.description}</p>

                      {notification.device_id && (
                        <p className={styles.deviceRow}>
                          <span className={styles.deviceLabel}>Device</span>
                          <code className={styles.deviceId}>{notification.device_id}</code>
                        </p>
                      )}
                    </div>
                  </motion.li>
                );
              })
            )}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
};

export default NotificationDashboard;
