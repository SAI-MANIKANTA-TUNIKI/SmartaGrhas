// Client-side: src/services/api.ts

import axios, { AxiosHeaders } from "axios";
import { io, Socket } from "socket.io-client";

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ?? ""
).replace(/\/+$/, "");

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is not configured");
}

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

// ============================================================
// TOKEN HELPERS
// ============================================================

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem("token");
  } catch {
    console.warn("[auth] Unable to access localStorage");
    return null;
  }
};

// ============================================================
// AXIOS REQUEST INTERCEPTOR
// ============================================================

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    const url = config.url ?? "";

    // Preserve the original backend exceptions.
    const skipBearerToken =
      url.includes("/room/sensor/report") ||
      url.includes("/room/device/status");

    config.headers = AxiosHeaders.from(config.headers);

    if (token && !skipBearerToken) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      config.headers.delete("Authorization");
    }

    // Avoid modifying endpoint paths or adding trailing slashes.
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// AXIOS RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[api] Request failed", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
    });

    return Promise.reject(error);
  }
);

// ============================================================
// SOCKET.IO CLIENT — iOS SAFARI COMPATIBLE
// ============================================================

let socket: Socket | null = null;
let socketUserId: string | null = null;

export const getSocket = (): Socket | null => socket;

export const connectSocket = (userId: string): Socket => {
  if (!userId) {
    throw new Error("A valid userId is required");
  }

  // Reuse the connection for the same user.
  if (socket && socketUserId === userId) {
    if (!socket.connected && !socket.active) {
      socket.connect();
    }

    return socket;
  }

  // Remove the previous socket when changing users.
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    socketUserId = null;
  }

  socketUserId = userId;

  socket = io(API_BASE_URL, {
    autoConnect: false,
    forceNew: true,

    withCredentials: true,

    // WebSocket first, polling fallback.
    transports: ["websocket", "polling"],

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,

    // Supply the current token during the handshake.
    // The backend must validate socket.handshake.auth.token.
    auth: (callback) => {
      callback({
        token: getAuthToken(),
      });
    },
  });

  socket.on("connect", () => {
    console.log("[socket] Connected:", socket?.id);

    // Preserve your existing server-side join event.
    socket?.emit("join", userId);
  });

  socket.on("disconnect", (reason) => {
    console.warn("[socket] Disconnected:", reason);

    // Socket.IO does not automatically reconnect after
    // a server-initiated disconnect.
    if (reason === "io server disconnect") {
      socket?.connect();
    }
  });

  socket.on("connect_error", (error) => {
    console.error("[socket] Connection error:", error.message);
  });

  socket.connect();

  return socket;
};

// ============================================================
// FORCE A FRESH SOCKET CONNECTION
// Call when iOS Safari returns to the foreground.
// ============================================================

export const reconnectSocket = (userId: string): Socket => {
  console.log("[socket] Reconnecting with a fresh connection");

  disconnectSocket();

  return connectSocket(userId);
};

// ============================================================
// DISCONNECT SOCKET
// ============================================================

export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    socketUserId = null;
  }
};

// ============================================================
// AUTH API
// ============================================================

export const register = (data: {
  name: string;
  email: string;
  password: string;
}) => api.post("/auth/register", data);

export const login = (data: {
  email: string;
  password: string;
}) => api.post("/auth/login", data);

export const logout = () => api.post("/auth/logout");

export const sendResetOtp = (data: { email: string }) =>
  api.post("/auth/send-reset-otp", data);

export const resetPassword = (data: {
  email: string;
  otp: string;
  password: string;
}) => api.post("/auth/reset-password", data);

// ============================================================
// ROOM API
// ============================================================

export const addRoom = (data: {
  name: string;
  esp32_ip: string;
  device_id: string;
}) => api.post("/room/add", data);

export const getRooms = () => api.get("/room/list");

export const updateRoom = (
  roomId: string,
  data: { name: string; device_id: string }
) => api.put(`/room/update/${roomId}`, data);

export const deleteRoom = (roomId: string) =>
  api.delete(`/room/delete/${roomId}`);

// ============================================================
// DEVICE API
// ============================================================

export const addDevice = (data: {
  room_id: string;
  type: string;
  relay_no: number;
  is_on?: boolean;
}) => api.post("/room/device/add", data);

export const updateDevice = (
  relay_no: string,
  data: {
    type?: string;
    image_url?: string;
    is_on?: boolean;
  }
) => api.put(`/room/device/update/${relay_no}`, data);

export const deleteDevice = (relay_no: string) =>
  api.delete(`/room/device/delete/${relay_no}`);

// ============================================================
// SCHEDULE API
// ============================================================

export const addSchedule = (data: {
  esp32_ip: string;
  relay_no: number;
  on_time: string | null;
  off_time: string | null;
}) => api.post("/room/schedule/add", data);

export const updateSchedule = (
  relay_no: string,
  data: {
    esp32_ip: string;
    relay_no: number;
    on_time: string | null;
    off_time: string | null;
  }
) => api.put(`/room/schedule/update/${relay_no}`, data);

export const deleteSchedule = (
  relay_no: string,
  params: { esp32_ip: string }
) => api.delete(`/room/schedule/delete/${relay_no}`, { params });

export const getSchedules = () => api.get("/room/schedule/list");

// ============================================================
// SENSOR API
// ============================================================

export const reportSensorData = async (data: {
  device_id: string;
  temperature: number;
  humidity: number;
}) => {
  try {
    return await api.post("/room/sensor/report", data);
  } catch (error: any) {
    console.error(
      "[sensor] Report failed:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const reportDeviceStatus = async (data: {
  esp32_ip: string;
  relay_no: number;
  is_on: boolean;
}) => {
  try {
    return await api.post("/room/device/status", data);
  } catch (error: any) {
    console.error(
      "[device] Status report failed:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const getLatestSensorData = async (device_id: string) => {
  try {
    return await api.get("/sensor/latest", {
      params: { device_id },
    });
  } catch (error: any) {
    console.error(
      "[sensor] Fetch failed:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const getRoomWithSensorData = async (device_id: string) =>
  api.get("/room/list-with-sensor-data", {
    params: { device_id },
  });

// ============================================================
// NOTIFICATIONS & PREFERENCES
// ============================================================

export const getNotifications = (params: {
  dashboard?: string;
  eventType?: string;
  limit?: number;
}) => api.get("/notifications", { params });

export const getUserPreferences = () => api.get("/preferences");

export const updateUserPreferences = (
  disabledEventTypes: string[]
) => api.put("/preferences", { disabledEventTypes });

export const getUserSettings = () => api.get("/settings");

export const updateUserSettings = (
  disabledEventTypes: string[]
) => api.put("/settings", { disabledEventTypes });

// ============================================================
// USER API
// ============================================================

export interface UserData {
  [x: string]: any;
  id: string;
}

export const getUserData = (): Promise<{ data: UserData }> =>
  api.get("/user/data");

export const getCameras = () => api.get("/camera");

export const addCamera = (data: {
  name: string;
  ip: string;
}) => api.post("/camera", data);

// ============================================================
// POWER API
// ============================================================

export const getPowerEntries = (timeRange: string) =>
  api.get("/power/entries", { params: { timeRange } });

export const getRoomPowers = () => api.get("/power/room-powers");

export const getDeviceStatuses = () =>
  api.get("/power/device-statuses");

// ============================================================
// LED SETTINGS API
// ============================================================

export const getLedSettings = async (microcontroller: string) => {
  const response = await axios.get(
    `${API_BASE_URL}/${microcontroller}`,
    { timeout: 30000, withCredentials: true }
  );

  return response.data;
};

export const updateLedSettings = async (
  microcontroller: string,
  settings: any
) => {
  await axios.post(
    `${API_BASE_URL}/${microcontroller}`,
    settings,
    { timeout: 30000, withCredentials: true }
  );
};

// ============================================================
// PROFILE API
// ============================================================

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  profileImage: string;
  phoneNumber: string;
  bio: string;
  address: string;
  websiteLinks: string[];
  isAccountVerified: boolean;
}

export const updateProfile = (formData: FormData) =>
  api.put("/user/profile", formData);

// ============================================================
// CHATBOT TYPES
// ============================================================

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface ChatResponse {
  reply: string;
  conversation_id: number;
}

// ============================================================
// CHATBOT AUTH HELPER
// Uses fetch while preserving the original endpoints.
// ============================================================

async function authenticatedFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Native fetch does not inherit Axios configuration.
  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });
}

// ============================================================
// SPEECH-TO-TEXT
// ============================================================

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");

  const res = await authenticatedFetch(
    `${API_BASE_URL}/transcribe`,
    {
      method: "POST",
      body: form,
    }
  );

  if (!res.ok) {
    throw new Error(`Transcription failed (${res.status})`);
  }

  const data = await res.json();
  return (data.text as string).trim();
}

// ============================================================
// CHAT
// ============================================================

export async function sendChat(
  message: string,
  conversationId: number | null = null
): Promise<ChatResponse> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Chat request failed (${res.status})`);
  }

  return res.json() as Promise<ChatResponse>;
}

// ============================================================
// TEXT-TO-SPEECH
// ============================================================

export async function textToSpeech(
  text: string,
  lang = "en"
): Promise<string> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/speak`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, lang }),
    }
  );

  if (!res.ok) {
    throw new Error(`TTS failed (${res.status})`);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// ============================================================
// CONVERSATIONS
// ============================================================

export async function getConversations(): Promise<Conversation[]> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/conversations`
  );

  if (!res.ok) {
    throw new Error("Failed to load conversations");
  }

  return res.json();
}

export async function getConversationMessages(
  convId: number
): Promise<Message[]> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/conversations/${convId}/messages`
  );

  if (!res.ok) {
    throw new Error("Failed to load messages");
  }

  return res.json();
}

export async function deleteConversation(
  convId: number
): Promise<void> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/conversations/${convId}`,
    { method: "DELETE" }
  );

  if (!res.ok) {
    throw new Error("Failed to delete conversation");
  }
}

export async function renameConversation(
  convId: number,
  title: string
): Promise<void> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/conversations/${convId}/title`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to rename conversation");
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default api;
