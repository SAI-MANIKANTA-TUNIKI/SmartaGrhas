// src/Components/Pages/NotificationDashboard.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import { FaCog } from "react-icons/fa";
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
      if (err.response?.data?.message.includes("Not authorized")) {
        navigate("/");
      }
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
    if (storedDisabled) {
      setDisabledEventTypes(JSON.parse(storedDisabled));
    }
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

  return (
    <motion.div
      className={`${styles.container} ${darkMode ? styles.darkMode : ""}`}
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <h1 className={styles.title}>Notification Dashboard</h1>

      <div className={styles.controls}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Filter by Dashboard:</label>
            <select
              value={filterDashboard}
              onChange={(e) => {
                setFilterDashboard(e.target.value);
                fetchNotifications();
              }}
              className={styles.select}
            >
              <option value="">All Dashboards</option>
              {dashboards.map((dashboard) => (
                <option key={dashboard} value={dashboard}>
                  {dashboard}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Filter by Event Type:</label>
            <select
              value={filterEventType}
              onChange={(e) => {
                setFilterEventType(e.target.value);
                fetchNotifications();
              }}
              className={styles.select}
            >
              <option value="">All Event Types</option>
              {eventTypes.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType}
                </option>
              ))}
            </select>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={styles.settingsButton}
          onClick={() => setShowSettings(!showSettings)}
        >
          <FaCog /> Settings
        </motion.button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className={styles.settingsPanel}
          >
            <h3>Notification Settings</h3>
            <p>Disable notifications for specific event types:</p>
            <div className={styles.eventTypeList}>
              {eventTypes.map((eventType) => (
                <label key={eventType} className={styles.eventTypeItem}>
                  <input
                    type="checkbox"
                    checked={disabledEventTypes.includes(eventType)}
                    onChange={() => handleToggleEventType(eventType)}
                  />
                  {eventType}
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <p>Loading...</p>
      ) : (
        <AnimatePresence>
          <motion.div
            className={styles.notificationList}
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 1 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 },
              },
            }}
          >
            {notifications.length === 0 ? (
              <p>No notifications found.</p>
            ) : (
              notifications.map((notification) => (
                <motion.div
                  key={notification._id}
                  className={styles.notificationCard}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    show: { opacity: 1, y: 0 },
                  }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ type: "spring", stiffness: 70, damping: 12 }}
                >
                  <div className={styles.notificationHeader}>
                    <h3>{notification.dashboard}</h3>
                    <span>{new Date(notification.timestamp).toLocaleString()}</span>
                  </div>
                  <p>
                    <strong>Event:</strong> {notification.eventType}
                  </p>
                  <p>{notification.description}</p>
                  {notification.device_id && (
                    <p>
                      <strong>Device ID:</strong> {notification.device_id}
                    </p>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default NotificationDashboard;
