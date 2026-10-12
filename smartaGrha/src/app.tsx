// src/App.tsx

import React, { useState, useEffect, useRef } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import "./app.css";

import Navbar from "./components/navigation/navbar";
import HomeDashboard from "./components/pages/homeDashboard";
import PowerSupply from "./components/pages/powerSuplay";
import Settings from "./components/pages/settings";
import StripLed from "./components/pages/stripLed";
import WelcomeDashboard from "./components/pages/welcomeDashboard";
import Authentication from "./components/authentication/authentication";
import Weather from "./components/pages/weather";
import Profile from "./components/pages/profile";
import Camera from "./components/pages/camear";
import RoomControl from "./components/pages/roomControl";
import NotificationDashboard from "./components/pages/notification";
import DeviceDataDashboard from "./components/pages/deviceData";
import ChatDashboard from "./components/pages/chatdashboard";

import {
  getUserData,
  connectSocket,
  disconnectSocket,
  reconnectSocket,
} from "./services/api";

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean>(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("darkMode") === "true";
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Keep the user ID in state so socket effects rerun
  // when authentication and user identification complete.
  const [userId, setUserId] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // ============================================================
  // AUTHENTICATION CHECK
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const res = await getUserData();

        if (cancelled) return;

        const data = res?.data as any;

        const id =
          data?.userData?.id ??
          data?.userData?._id ??
          data?.id ??
          data?._id;

        if (!id) {
          throw new Error(
            "Authenticated user ID was not returned by the API"
          );
        }

        const resolvedUserId = String(id);

        userIdRef.current = resolvedUserId;
        setUserId(resolvedUserId);
        setIsAuthenticated(true);

        console.log("[auth] Session restored");
      } catch (error) {
        if (cancelled) return;

        console.warn("[auth] Unable to restore session");

        userIdRef.current = null;
        setUserId(null);
        setIsAuthenticated(false);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // DARK MODE
  // ============================================================

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);

    try {
      localStorage.setItem("darkMode", String(darkMode));
    } catch {
      // Dark mode still works for the current session.
    }
  }, [darkMode]);

  // ============================================================
  // SOCKET.IO CONNECTION
  // ============================================================

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      disconnectSocket();
      return;
    }

    console.log("[socket] Initializing connection");

    connectSocket(userId);

    return () => {
      // Do not disconnect here just because the effect reruns.
      // The shared socket client manages connection reuse.
    };
  }, [isAuthenticated, userId]);

  // ============================================================
  // IOS SAFARI FOREGROUND RECONNECTION
  // ============================================================

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const scheduleReconnect = () => {
      if (document.visibilityState !== "visible") return;

      // Avoid multiple reconnect timers when Safari fires
      // several lifecycle events close together.
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
      }

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;

        if (document.visibilityState !== "visible") return;

        const currentUserId = userIdRef.current;

        if (!currentUserId) return;

        // Reconnect only if the socket is missing or disconnected.
        const { getSocket } = requireSocketHelpers();

        const currentSocket = getSocket();

        if (!currentSocket || !currentSocket.connected) {
          console.log(
            "[socket] Safari foreground detected; reconnecting"
          );

          reconnectSocket(currentUserId);
        }
      }, 700);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleReconnect();
      }
    };

    const handlePageShow = () => {
      scheduleReconnect();
    };

    const handleFocus = () => {
      scheduleReconnect();
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);

      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [isAuthenticated, userId]);

  // ============================================================
  // LOGIN
  // ============================================================

  const handleLogin = () => {
    // Authentication component should save the token and then
    // call this callback after a successful login.
    setLoading(true);

    void getUserData()
      .then((res) => {
        const data = res?.data as any;

        const id =
          data?.userData?.id ??
          data?.userData?._id ??
          data?.id ??
          data?._id;

        if (!id) {
          throw new Error("User ID missing after login");
        }

        const resolvedUserId = String(id);

        userIdRef.current = resolvedUserId;
        setUserId(resolvedUserId);
        setIsAuthenticated(true);
      })
      .catch((error) => {
        console.error("[auth] Unable to load user after login", error);

        userIdRef.current = null;
        setUserId(null);
        setIsAuthenticated(false);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    disconnectSocket();

    userIdRef.current = null;
    setUserId(null);
    setIsAuthenticated(false);

    try {
      localStorage.removeItem("token");
      localStorage.removeItem("isAuthenticated");
    } catch {
      // Ignore storage errors during logout.
    }

    // Clear a readable cookie if your application uses one.
    // HttpOnly cookies must be cleared by the backend.
    document.cookie =
      "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";

    console.log("[auth] Logged out");
  };

  // ============================================================
  // UI HELPERS
  // ============================================================

  const toggleDarkMode = () => {
    setDarkMode((previous) => !previous);
  };

  const PrivateRoute = ({
    children,
  }: {
    children: React.ReactNode;
  }) => {
    return isAuthenticated ? (
      <>{children}</>
    ) : (
      <Navigate to="/welcome" replace />
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // ============================================================
  // APPLICATION ROUTES
  // ============================================================

  return (
    <Router>
      <div className={`app ${darkMode ? "darkMode" : ""}`}>
        {isAuthenticated && (
          <Navbar
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            handleSignOut={handleLogout}
          />
        )}

        <Routes>
          <Route
            path="/welcome"
            element={
              !isAuthenticated ? (
                <WelcomeDashboard
                  darkMode={darkMode}
                  onToggleDarkMode={toggleDarkMode}
                />
              ) : (
                <Navigate to="/home" replace />
              )
            }
          />

          <Route
            path="/auth"
            element={
              !isAuthenticated ? (
                <Authentication
                  darkMode={darkMode}
                  onToggleDarkMode={toggleDarkMode}
                  handleLogin={handleLogin}
                />
              ) : (
                <Navigate to="/home" replace />
              )
            }
          />

          <Route
            path="/home"
            element={
              <PrivateRoute>
                <HomeDashboard darkMode={darkMode} />
              </PrivateRoute>
            }
          />

          <Route
            path="/power-supply"
            element={
              <PrivateRoute>
                <PowerSupply darkMode={darkMode} />
              </PrivateRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings
                  darkMode={darkMode}
                  onToggleDarkMode={toggleDarkMode}
                  handleSignOut={handleLogout}
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/weather"
            element={
              <PrivateRoute>
                <Weather darkMode={darkMode} />
              </PrivateRoute>
            }
          />

          <Route
            path="/strip-led"
            element={
              <PrivateRoute>
                <StripLed darkMode={darkMode} />
              </PrivateRoute>
            }
          />

          <Route
            path="/camera"
            element={
              <PrivateRoute>
                <Camera darkMode={darkMode} />
              </PrivateRoute>
            }
          />

          <Route
            path="/Notification"
            element={
              <PrivateRoute>
                <NotificationDashboard darkMode={darkMode} />
              </PrivateRoute>
            }
          />

          <Route
            path="/device-data"
            element={
              <PrivateRoute>
                <DeviceDataDashboard darkMode={darkMode} />
              </PrivateRoute>
            }
          />

          <Route
            path="/room-control"
            element={
              <PrivateRoute>
                <RoomControl
                  darkMode={darkMode}
                  onToggleDarkMode={toggleDarkMode}
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/Aichatbot"
            element={
              <PrivateRoute>
                <ChatDashboard darkMode={darkMode} />
              </PrivateRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          <Route
            path="/"
            element={
              <Navigate
                to={isAuthenticated ? "/home" : "/welcome"}
                replace
              />
            }
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </div>
    </Router>
  );
};

// Helper keeps socket access explicit without changing the API client.
function requireSocketHelpers() {
  return {
    getSocket: requireGetSocket,
  };
}

import { getSocket as requireGetSocket } from "./services/api";

export default App;
