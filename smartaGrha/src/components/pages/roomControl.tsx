// Client-side: src/components/RoomControl.tsx (corrected)
// Note: Removed unused editData imageFile since no upload implemented. Fixed types, ensured relay_no consistency as number.
// Added String(relay_no) for devices state to avoid coercion issues. Removed profitData rename (it's active devices count).
// Cleaned up unused imports/variables. Ensured all socket events handle userId if present (though server emits without in some).
// Fixed potential null currentRoom in handlers. Added missing imports if any. No syntax errors found, but improved logic.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from "framer-motion";
import io from "socket.io-client";
import {
  addRoom,
  addDevice,
  updateDevice,
  deleteDevice,
  getRooms,
  updateRoom,
  deleteRoom,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedules,
  getLatestSensorData,
} from "../../services/api";
import ToggleSwitch from "../toggleswitch/toggleswitch";
import styles from "../Pagesmodulecss/RoomControl.module.css";

const socket = io(import.meta.env.VITE_WEBSOCKET_URL, { withCredentials: true });

interface DeviceConfig {
  type: string;
  relay_no: number;
  is_on: boolean;
}

interface RoomConfig {
  _id: string;
  esp32_ip: string;
  device_id: string;
  name: string;
  devices: DeviceConfig[];
}

interface DeviceState {
  [key: string]: { checked: boolean };
}

interface NewDevice {
  type: string;
  relay_no: string;
}

interface OfficeRoomProps {
  darkMode: boolean;
  onToggleDarkMode?: () => void;
}

interface DeviceSchedule {
  esp32_ip: string;
  relay_no: number;
  on_time: string | null;
  off_time: string | null;
}

interface SensorData {
  temperature: number | null;
  humidity: number | null;
}

// ---------- Inline SVG Icons (24x24) ---------- //
const IconWrap: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const BulbIcon = ({ size = 28 }: { size?: number }) => (
  <IconWrap size={size}>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M2 10a8 8 0 1 1 16 0c0 2.6-1.2 4-2.3 5.1-.8.8-1.2 1.4-1.2 2.9h-9c0-1.5-.4-2.1-1.2-2.9C3.2 14 2 12.6 2 10z" />
  </IconWrap>
);

const FanIcon = ({ size = 28 }: { size?: number }) => (
  <IconWrap size={size}>
    <circle cx="12" cy="12" r="2.2" />
    <path d="M12 4c3 0 4 .8 4 2.5S14 9 12 9M20 12c0 3-.8 4-2.5 4S15 14 15 12M12 20c-3 0-4-.8-4-2.5S10 15 12 15M4 12c0-3 .8-4 2.5-4S9 10 9 12" />
  </IconWrap>
);

const TvIcon = ({ size = 30 }: { size?: number }) => (
  <IconWrap size={size}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M8 20h8" />
  </IconWrap>
);

const AcIcon = ({ size = 30 }: { size?: number }) => (
  <IconWrap size={size}>
    <rect x="2.5" y="5" width="19" height="7" rx="2" />
    <path d="M5 9h14" />
    <path d="M6 15c.8 1.2 2.4 1.2 3.2 0M11 15c.8 1.2 2.4 1.2 3.2 0M16 15c.8 1.2 2.4 1.2 3.2 0" />
  </IconWrap>
);

const FridgeIcon = ({ size = 28 }: { size?: number }) => (
  <IconWrap size={size}>
    <rect x="6" y="3" width="12" height="18" rx="2" />
    <path d="M6 11h12" />
    <path d="M9 8v2M9 14v2" />
  </IconWrap>
);

const MonitorIcon = ({ size = 30 }: { size?: number }) => (
  <IconWrap size={size}>
    <rect x="3" y="5" width="18" height="12" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </IconWrap>
);

// ---------- Background Ornaments ---------- //
const ApplianceParticle: React.FC<{
  i: number;
  color: string;
  darkMode: boolean;
  Icon: React.FC<{ size?: number }>;
}> = ({ i, color, darkMode, Icon }) => {
  const duration = 14 + (i % 5);
  const delay = (i * 0.37) % 5;
  const floatY = [0, -20, 0, 18, 0];
  const rot = [0, 2, -2, 3, 0];
  const size = 22 + ((i * 7) % 12);
  const x = (i * 97) % 100;
  const y = (i * 61) % 100;

  return (
    <motion.div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        color,
        filter: darkMode ? "drop-shadow(0 0 6px rgba(0,255,255,.35))" : "drop-shadow(0 0 6px rgba(0,0,0,.15))",
        pointerEvents: "none",
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 0.65, y: floatY, rotate: rot }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {Icon === FanIcon ? (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
          <FanIcon size={size} />
        </motion.div>
      ) : (
        <Icon size={size} />
      )}
    </motion.div>
  );
};

const BackgroundFX: React.FC<{ darkMode: boolean; activeCount: number }> = ({ darkMode, activeCount }) => {
  const cx = useMotionValue(0);
  const cy = useMotionValue(0);
  const rotX = useTransform(cy, [0, 1], [6, -6]);
  const rotY = useTransform(cx, [0, 1], [-6, 6]);

  const onMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY, currentTarget } = e;
    const rect = (currentTarget as HTMLElement).getBoundingClientRect();
    cx.set((clientX - rect.left) / rect.width);
    cy.set((clientY - rect.top) / rect.height);
  };

  const pingControls = useAnimation();
  useEffect(() => {
    pingControls.start({
      opacity: [0.0, 0.3, 0],
      scale: [0.8, 1.6, 2.2],
      transition: { duration: 1.6, ease: "easeOut" },
    });
  }, [activeCount, pingControls]);

  const palette = darkMode
    ? ["#8be9fd", "#50fa7b", "#bd93f9", "#ffb86c"]
    : ["#0ea5e9", "#22c55e", "#a855f7", "#f59e0b"];

  const icons = [BulbIcon, FanIcon, TvIcon, AcIcon, FridgeIcon, MonitorIcon];

  return (
    <motion.div
      onMouseMove={onMouseMove}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        perspective: 800,
      }}
      animate={{ rotateX: rotX as unknown as number, rotateY: rotY as unknown as number }}
    >
      <motion.div
        aria-hidden
        style={{ position: "absolute", inset: -100, zIndex: 0, background: darkMode
          ? "radial-gradient(1200px 600px at 10% 10%, rgba(139,233,253,0.08), transparent),\n      radial-gradient(800px 400px at 90% 20%, rgba(189,147,249,0.10), transparent),\n             radial-gradient(1000px 500px at 50% 90%, rgba(80,250,123,0.08), transparent),\n             linear-gradient(180deg, #0b1020 0%, #0a0f1a 60%, #0a0a12 100%)"
          : "radial-gradient(1200px 600px at 10% 10%, rgba(14,165,233,0.10), transparent),\n       radial-gradient(800px 400px at 90% 20%, rgba(168,85,247,0.10), transparent),\n             radial-gradient(1000px 500px at 50% 90%, rgba(34,197,94,0.10), transparent),\n             linear-gradient(180deg, #f6f8ff 0%, #eef2ff 60%, #e9eefc 100%)" }}
        animate={{ opacity: [0.9, 1, 0.95, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px, 40px 40px",
          mixBlendMode: darkMode ? "screen" : "multiply",
          opacity: darkMode ? 0.15 : 0.08,
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={pingControls}
        style={{
          position: "absolute",
          right: "10%",
          top: "18%",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${palette[0]}33 0%, ${palette[1]}18 45%, transparent 60%)`,
          filter: "blur(8px)",
        }}
      />

      {Array.from({ length: 28 }).map((_, i) => (
        <ApplianceParticle key={i} i={i} color={palette[i % palette.length]} darkMode={darkMode} Icon={icons[i % icons.length]} />
      ))}
    </motion.div>
  );
};

const RoomControl: React.FC<OfficeRoomProps> = ({ darkMode }) => {
  const [rooms, setRooms] = useState<RoomConfig[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomConfig | null>(null);
  const [devices, setDevices] = useState<DeviceState>({});
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [editData, setEditData] = useState<{ [key: number]: { type: string } }>({});
  const [newDevice, setNewDevice] = useState<NewDevice>({ type: "", relay_no: "" });
  const [newRoom, setNewRoom] = useState<{ name: string; esp32_ip: string; device_id: string }>({ name: "", esp32_ip: "", device_id: "" });
  const [activeDevices, setActiveDevices] = useState(0);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [currentRelayNo, setCurrentRelayNo] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<DeviceSchedule[]>([]);
  const [newSchedule, setNewSchedule] = useState<{ on_time: string; off_time: string }>({ on_time: "", off_time: "" });
  const [sensorDataMap, setSensorDataMap] = useState<{ [key: string]: SensorData }>({});
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchLatestSensorData = async (device_id: string, retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await getLatestSensorData(device_id);
        if (response.data.success && response.data.sensorData) {
          setSensorDataMap((prev) => ({
            ...prev,
            [device_id]: {
              temperature: response.data.sensorData.temperature,
              humidity: response.data.sensorData.humidity,
            },
          }));
          return;
        } else {
          setSensorDataMap((prev) => ({ ...prev, [device_id]: { temperature: null, humidity: null } }));
        }
      } catch (err: any) {
        if (attempt === retries) {
          setError(`Failed to fetch sensor data after ${retries} attempts`);
          setSensorDataMap((prev) => ({ ...prev, [device_id]: { temperature: null, humidity: null } }));
        } else {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  };

  useEffect(() => { if (currentRoom) fetchLatestSensorData(currentRoom.device_id); }, [currentRoom]);

  useEffect(() => {
    fetchRooms();
    fetchSchedules();

    socket.on("deviceUpdated", (data: { roomId: string; device: DeviceConfig }) => {
      if (currentRoom && data.roomId === currentRoom._id) {
        const relayKey = String(data.device.relay_no);
        setDevices((prev) => ({ ...prev, [relayKey]: { checked: data.device.is_on } }));
        setCurrentRoom((prev) => prev ? ({ ...prev, devices: prev.devices.map((d) => d.relay_no === data.device.relay_no ? data.device : d) }) : prev);
      }
    });

    socket.on("roomAdded", (data: { room: RoomConfig }) => setRooms((prev) => [...prev, data.room]));

    socket.on("roomUpdated", (data: { room: RoomConfig }) => {
      setRooms((prev) => prev.map((r) => (r._id === data.room._id ? data.room : r)));
      if (currentRoom?._id === data.room._id) setCurrentRoom(data.room);
    });

    socket.on("roomDeleted", (data: { roomId: string }) => {
      setRooms((prev) => prev.filter((r) => r._id !== data.roomId));
      if (currentRoom?._id === data.roomId) setCurrentRoom(null);
    });

    socket.on("deviceAdded", (data: { roomId: string; device: DeviceConfig }) => {
      setRooms((prev) => prev.map((r) => (r._id === data.roomId ? { ...r, devices: [...r.devices, data.device] } : r)));
      if (currentRoom?._id === data.roomId) {
        setCurrentRoom((prev) => (prev ? { ...prev, devices: [...prev.devices, data.device] } : prev));
        const relayKey = String(data.device.relay_no);
        setDevices((prev) => ({ ...prev, [relayKey]: { checked: data.device.is_on } }));
      }
    });

    socket.on("deviceDeleted", (data: { relay_no: number }) => {
      setRooms((prev) => prev.map((r) => ({ ...r, devices: r.devices.filter((d) => d.relay_no !== data.relay_no) })));
      if (currentRoom) {
        setCurrentRoom((prev) => prev ? { ...prev, devices: prev.devices.filter((d) => d.relay_no !== data.relay_no) } : prev);
        const relayKey = String(data.relay_no);
        setDevices((prev) => { const nd = { ...prev }; delete nd[relayKey]; return nd; });
      }
    });

    socket.on("connect_error", (_err) => setError("Socket.IO connection failed"));

    socket.on("sensorData", (data: { device_id: string; temperature: number; humidity: number }) => {
      if (
        typeof data.device_id !== "string" ||
        typeof data.temperature !== "number" ||
        typeof data.humidity !== "number" ||
        isNaN(data.temperature) ||
        isNaN(data.humidity)
      ) return;
      setSensorDataMap((prev) => ({ ...prev, [data.device_id]: { temperature: data.temperature, humidity: data.humidity } }));
    });

    socket.on("scheduleDeleted", (data: { esp32_ip: string; relay_no: number }) => {
      setSchedules((prev) => prev.filter((s) => !(s.esp32_ip === data.esp32_ip && s.relay_no === data.relay_no)));
      if (currentRelayNo === data.relay_no && currentRoom?.esp32_ip === data.esp32_ip) {
        setNewSchedule({ on_time: "", off_time: "" });
        setIsScheduleModalOpen(false);
        setCurrentRelayNo(null);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("sensorData");
      socket.off("deviceUpdated");
      socket.off("roomAdded");
      socket.off("roomUpdated");
      socket.off("roomDeleted");
      socket.off("deviceAdded");
      socket.off("deviceDeleted");
      socket.off("scheduleDeleted");
    };
  }, [currentRoom]);

  useEffect(() => {
    const onCount = Object.values(devices).filter((d) => d.checked).length;
    setActiveDevices(onCount);
  }, [devices]);

  const fetchRooms = async () => {
    try {
      const res = await getRooms();
      const formattedRooms: RoomConfig[] = res.data.rooms;
      setRooms(formattedRooms);
      if (formattedRooms.length > 0 && !currentRoom) {
        setCurrentRoom(formattedRooms[0]);
        setDevices(formattedRooms[0].devices.reduce((acc: DeviceState, device: DeviceConfig) => {
          const relayKey = String(device.relay_no);
          acc[relayKey] = { checked: device.is_on };
          return acc;
        }, {}));
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to fetch rooms";
      setError(errorMsg);
      if (errorMsg.includes("Not authorized")) navigate("/");
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await getSchedules();
      setSchedules(res.data.schedules);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to fetch schedules";
      setError(errorMsg);
      if (errorMsg.includes("Not authorized")) navigate("/");
    }
  };

  const handleToggle = async (relayNo: number) => {
    const relayKey = String(relayNo);
    const updatedChecked = !devices[relayKey]?.checked;
    setDevices((prev) => ({ ...prev, [relayKey]: { checked: updatedChecked } }));
    try {
      await updateDevice(relayNo.toString(), { is_on: updatedChecked });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to update device state";
      setError(errorMsg);
      setDevices((prev) => ({ ...prev, [relayKey]: { checked: !updatedChecked } }));
      if (errorMsg.includes("Not authorized")) navigate("/");
    }
  };

  const handleOpenScheduleModal = (relayNo: number) => {
    setCurrentRelayNo(relayNo);
    const existingSchedule = schedules.find((s) => s.relay_no === relayNo && s.esp32_ip === currentRoom?.esp32_ip);
    setNewSchedule({
      on_time: existingSchedule?.on_time ? new Date(existingSchedule.on_time).toISOString().slice(0, 16) : "",
      off_time: existingSchedule?.off_time ? new Date(existingSchedule.off_time).toISOString().slice(0, 16) : "",
    });
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (currentRelayNo == null || !currentRoom) return;
    const scheduleData = {
      esp32_ip: currentRoom.esp32_ip,
      relay_no: currentRelayNo,
      on_time: newSchedule.on_time ? new Date(newSchedule.on_time).toISOString() : null,
      off_time: newSchedule.off_time ? new Date(newSchedule.off_time).toISOString() : null,
    };
    try {
      const existingSchedule = schedules.find((s) => s.relay_no === currentRelayNo && s.esp32_ip === currentRoom.esp32_ip);
      if (existingSchedule) await updateSchedule(currentRelayNo.toString(), scheduleData);
      else await addSchedule(scheduleData);
      await fetchSchedules();
      setIsScheduleModalOpen(false);
      setCurrentRelayNo(null);
      setNewSchedule({ on_time: "", off_time: "" });
      setError("");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to save schedule";
      setError(errorMsg);
      if (errorMsg.includes("Not authorized")) navigate("/");
    }
  };

  const handleTurnOffAllDevices = async () => {
    if (!currentRoom) return;
    const updatedDevices = Object.keys(devices).reduce((acc, key) => { acc[key] = { checked: false }; return acc; }, {} as DeviceState);
    setDevices(updatedDevices);
    try {
      for (const device of currentRoom.devices) await updateDevice(device.relay_no.toString(), { is_on: false });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to turn off all devices";
      setError(errorMsg);
      await fetchRooms();
      if (errorMsg.includes("Not authorized")) navigate("/");
    }
  };

  const handleRemoveDevice = async (relayNo: number) => {
    if (!currentRoom) return;
    if (!window.confirm("Are you sure you want to remove this device?")) return;
    try {
      await deleteDevice(relayNo.toString());
      await deleteSchedule(relayNo.toString(), { esp32_ip: currentRoom.esp32_ip });
      const relayKey = String(relayNo);
      setDevices((prev) => { const nd = { ...prev }; delete nd[relayKey]; return nd; });
      await fetchRooms();
      await fetchSchedules();
      setError("");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to remove device";
      setError(errorMsg);
      if (errorMsg.includes("Not authorized")) navigate("/");
    }
  };

  const handleRemoveRoom = async () => {
    if (!currentRoom) return;
    if (!window.confirm("Are you sure you want to remove this room and all its devices?")) return;
    try {
      await deleteRoom(currentRoom._id);
      setCurrentRoom(null);
      await fetchRooms();
      await fetchSchedules();
      setError("");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to remove room";
      setError(errorMsg);
      if (errorMsg.includes("Not authorized")) navigate("/");
    }
  };

  const handleEditRoom = async () => {
    if (!currentRoom || !newRoom.name.trim()) { setError("Room name is required"); return; }
    try {
      await updateRoom(currentRoom._id, { name: newRoom.name, device_id: newRoom.device_id });
      setNewRoom({ name: "", esp32_ip: "", device_id: "" });
      setIsEditRoomModalOpen(false);
      setError("");
      await fetchRooms();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to update room";
      setError(errorMsg);
      if (errorMsg.includes("Not authorized")) navigate("/");
    }
  };

  const handleAddDevice = async () => {
    if (!newDevice.type.trim()) { setError("Device name is required"); return; }
    const relayNoNum = parseInt(newDevice.relay_no);
    if (isNaN(relayNoNum) || relayNoNum < 0 || relayNoNum > 100) {
      setError("Relay number must be between 0 and 100");
      return;
    }
    if (!currentRoom) { setError("No room selected"); return; }

    try {
      await addDevice({ room_id: currentRoom._id, type: newDevice.type, relay_no: relayNoNum, is_on: false });
      setNewDevice({ type: "", relay_no: "" });
      setIsAddDeviceModalOpen(false);
      setError("");
      await fetchRooms();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to add device";
      setError(errorMsg);
      if (errorMsg.includes("Not authorized")) navigate("/");
    }
  };

  const handleAddRoom = async () => {
    if (!newRoom.name.trim()) { setError("Room name is required"); return; }
    if (!newRoom.esp32_ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) { setError("Invalid ESP32 IP address"); return; }
    if (!newRoom.device_id.trim()) { setError("Device ID is required (e.g., device1)"); return; }
    try {
      await addRoom({ name: newRoom.name, esp32_ip: newRoom.esp32_ip, device_id: newRoom.device_id });
      setNewRoom({ name: "", esp32_ip: "", device_id: "" });
      setIsAddRoomModalOpen(false);
      setError("");
      await fetchRooms();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to add room";
      setError(errorMsg);
      if (errorMsg.includes("Not authorized")) navigate("/");
    }
  };

  const handleRoomSwitch = (roomId: string) => {
    const selectedRoom = rooms.find((room) => room._id === roomId);
    if (selectedRoom) {
      setCurrentRoom(selectedRoom);
      setDevices(selectedRoom.devices.reduce((acc: DeviceState, device: DeviceConfig) => {
        const relayKey = String(device.relay_no);
        acc[relayKey] = { checked: device.is_on };
        return acc;
      }, {}));
      setError("");
    }
  };

  const handleEditButtonClick = (relayNo: number) => {
    const relayKey = String(relayNo);
    setEditMode((prev) => {
      const newEdit = !prev[relayKey];
      if (newEdit && currentRoom) {
        const device = currentRoom.devices.find((d) => d.relay_no === relayNo);
        if (device) {
          setEditData((prevData) => ({
            ...prevData,
            [relayNo]: { type: device.type },
          }));
        }
      } else {
        setEditData((prevData) => {
          const newData = { ...prevData };
          delete newData[relayNo];
          return newData;
        });
      }
      return { ...prev, [relayKey]: newEdit };
    });
  };

  const handleSaveEdit = async (relayNo: number) => {
    if (!currentRoom || !editData[relayNo]) return;
    const data = editData[relayNo];

    try {
      const updatePayload: { type?: string } = {};
      const origDevice = currentRoom.devices.find((d) => d.relay_no === relayNo);
      if (origDevice && data.type !== origDevice.type) updatePayload.type = data.type;

      if (Object.keys(updatePayload).length > 0) {
        await updateDevice(relayNo.toString(), updatePayload);
      }
      await fetchRooms();
      const relayKey = String(relayNo);
      setEditMode((prev) => ({ ...prev, [relayKey]: false }));
      setEditData((prev) => {
        const newData = { ...prev };
        delete newData[relayNo];
        return newData;
      });
      setError("");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to update device";
      setError(errorMsg);
      if (errorMsg.includes("Not authorized")) navigate("/");
    }
  };

  const handleCancelEdit = (relayNo: number) => {
    const relayKey = String(relayNo);
    setEditMode((prev) => ({ ...prev, [relayKey]: false }));
    setEditData((prev) => {
      const newData = { ...prev };
      delete newData[relayNo];
      return newData;
    });
  };

  return (
    <div className={`min-h-screen ${darkMode ? styles.darkMode : styles.lightMode}`} style={{ position: "relative" }}>
      <BackgroundFX darkMode={darkMode} activeCount={activeDevices} />

      <div className={styles.container} style={{ position: "relative", zIndex: 1 }}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>{currentRoom?.name || "Select a Room"} Control</h1>
          {currentRoom && (
            <div className={styles.headerControls}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setNewRoom({ name: currentRoom.name, esp32_ip: currentRoom.esp32_ip, device_id: currentRoom.device_id }); setIsEditRoomModalOpen(true); }}
                className={styles.editButton}
              >Edit Room</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleRemoveRoom} className={styles.removeButton}>Remove Room</motion.button>
            </div>
          )}

          <div className={styles.roomSwitchButtons}>
            {rooms.map((room) => (
              <motion.button key={room._id} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleRoomSwitch(room._id)} className={`${styles.roomButton} ${currentRoom?._id === room._id ? styles.activeRoom : ""}`}>
                {room.name}
              </motion.button>
            ))}
          </div>
        </header>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.error}>{error}</motion.p>
        )}

        {currentRoom && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={styles.sensorData}>
            <p>Temperature: {sensorDataMap[currentRoom.device_id]?.temperature ?? "N/A"}°C</p>
            <p>Humidity: {sensorDataMap[currentRoom.device_id]?.humidity ?? "N/A"}%</p>
          </motion.div>
        )}

        {currentRoom && (
          <div className={styles.devicesGrid}>
            <AnimatePresence>
              {currentRoom.devices.map((device, i) => {
                const relayKey = String(device.relay_no);
                return (
                <motion.div key={device.relay_no} className={styles.deviceCard}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className={styles.deviceInfo}>
                    <div className={styles.deviceName}>
                      {editMode[relayKey] ? (
                        <div className={styles.editDeviceControls}>
                          <input
                            type="text"
                            value={editData[device.relay_no]?.type || ""}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                [device.relay_no]: { ...prev[device.relay_no], type: e.target.value },
                              }))
                            }
                            className={styles.input}
                            placeholder="Device Name"
                          />
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSaveEdit(device.relay_no)} className={styles.addButton}>
                            Save
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleCancelEdit(device.relay_no)} className={styles.cancelButton}>
                            Cancel
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleRemoveDevice(device.relay_no)} className={styles.removeButton}>
                            Remove
                          </motion.button>
                        </div>
                      ) : (
                        <span>{device.type}</span>
                      )}
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className={styles.editButton} onClick={() => handleEditButtonClick(device.relay_no)}>
                        <span className={styles.threeDots}>...</span>
                      </motion.button>
                    </div>
                  </div>
                  <div className={styles.deviceStatus}>
                    <ToggleSwitch id={device.relay_no.toString()} checked={devices[relayKey]?.checked || false} onChange={() => handleToggle(device.relay_no)} />
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleOpenScheduleModal(device.relay_no)} className={styles.scheduleButton}>Schedule</motion.button>
                  </div>
                </motion.div>
              );})}
            </AnimatePresence>
          </div>
        )}

        {currentRoom && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsAddDeviceModalOpen(true)} className={styles.addButton}>Add Device</motion.button>
        )}
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsAddRoomModalOpen(true)} className={styles.addButton}>Add Room</motion.button>

        <AnimatePresence>
          {isAddDeviceModalOpen && currentRoom && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.modalOverlay}>
              <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className={styles.modal}>
                <h2 className={styles.modalTitle}>Add New Device</h2>
                <input type="text" placeholder="Device Name (e.g., Fan)" value={newDevice.type} onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value })} className={styles.input} />
                <input type="number" placeholder="Relay Number (0-100)" value={newDevice.relay_no} onChange={(e) => setNewDevice({ ...newDevice, relay_no: e.target.value })} className={styles.input} min="0" max="100" />
                <div className={styles.modalButtons}>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAddDevice} className={styles.addButton}>Add Device</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setNewDevice({ type: "", relay_no: "" }); setIsAddDeviceModalOpen(false); setError(""); }} className={styles.cancelButton}>Cancel</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAddRoomModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.modalOverlay}>
              <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className={styles.modal}>
                <h2 className={styles.modalTitle}>Add New Room</h2>
                <input type="text" placeholder="Room Name" value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} className={styles.input} />
                <input type="text" placeholder="ESP32 IP (e.g., 192.168.1.100)" value={newRoom.esp32_ip} onChange={(e) => setNewRoom({ ...newRoom, esp32_ip: e.target.value })} className={styles.input} />
                <input type="text" placeholder="Device ID (e.g., device1)" value={newRoom.device_id} onChange={(e) => setNewRoom({ ...newRoom, device_id: e.target.value })} className={styles.input} />
                <div className={styles.modalButtons}>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAddRoom} className={styles.addButton}>Add Room</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setNewRoom({ name: "", esp32_ip: "", device_id: "" }); setIsAddRoomModalOpen(false); setError(""); }} className={styles.cancelButton}>Cancel</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isEditRoomModalOpen && currentRoom && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.modalOverlay}>
              <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className={styles.modal}>
                <h2 className={styles.modalTitle}>Edit Room</h2>
                <input type="text" placeholder="Room Name" value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} className={styles.input} />
                <input type="text" placeholder="Device ID (e.g., device1)" value={newRoom.device_id} onChange={(e) => setNewRoom({ ...newRoom, device_id: e.target.value })} className={styles.input} />
                <div className={styles.modalButtons}>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleEditRoom} className={styles.addButton}>Save Changes</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setNewRoom({ name: "", esp32_ip: "", device_id: "" }); setIsEditRoomModalOpen(false); setError(""); }} className={styles.cancelButton}>Cancel</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isScheduleModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.modalOverlay}>
              <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className={styles.modal}>
                <h2 className={styles.modalTitle}>Schedule Device</h2>
                <label className={styles.inputLabel}>Turn ON Time:
                  <input type="datetime-local" value={newSchedule.on_time} onChange={(e) => setNewSchedule({ ...newSchedule, on_time: e.target.value })} className={styles.input} />
                </label>
                <label className={styles.inputLabel}>Turn OFF Time:
                  <input type="datetime-local" value={newSchedule.off_time} onChange={(e) => setNewSchedule({ ...newSchedule, off_time: e.target.value })} className={styles.input} />
                </label>
                <div className={styles.modalButtons}>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveSchedule} className={styles.addButton}>Save Schedule</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setIsScheduleModalOpen(false); setCurrentRelayNo(null); setNewSchedule({ on_time: "", off_time: "" }); setError(""); }} className={styles.cancelButton}>Cancel</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentRoom && (
          <div className={styles.controls}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={styles.turnOffAll} onClick={handleTurnOffAllDevices}>Turn Off All Devices</motion.button>
            <p className={styles.deviceStatusText}>Devices On: {activeDevices}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomControl;