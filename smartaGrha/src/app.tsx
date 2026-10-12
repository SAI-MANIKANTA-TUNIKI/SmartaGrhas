// src/App.tsx
import React, { useState, useEffect, useRef } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './app.css';
import Navbar from './components/navigation/navbar';
import HomeDashboard from './components/pages/homeDashboard';
import PowerSupply from './components/pages/powerSuplay';
import Settings from './components/pages/settings';
import StripLed from './components/pages/stripLed';
import WelcomeDashboard from './components/pages/welcomeDashboard';
import Authentication from './components/authentication/authentication';
import Weather from './components/pages/weather';
import Profile from './components/pages/profile';
import Camera from './components/pages/camear';
import RoomControl from './components/pages/roomControl';
import {
  getUserData,
  connectSocket,
  disconnectSocket,
  reconnectSocket,
} from './services/api';
import NotificationDashboard from "./components/pages/notification";
import DeviceDataDashboard from "./components/pages/deviceData";
import ChatDashboard from './components/pages/chatdashboard';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('darkMode') === 'true');
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  // ── Auth check (existing) ──
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await getUserData();
        setIsAuthenticated(true);
        const id = (res?.data as any)?.userData?.id
          || (res?.data as any)?.id
          || (res?.data as any)?._id;
        if (id) userIdRef.current = String(id);
      } catch (error) {
        console.warn("User not authenticated", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // ── Dark mode (existing) ──
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // ── NEW: Socket.IO connect / disconnect when auth changes ──
  useEffect(() => {
    if (isAuthenticated && userIdRef.current) {
      connectSocket(userIdRef.current);
    } else {
      disconnectSocket();
    }
    return () => {
      // Do NOT disconnect on every render — only when auth flips
    };
  }, [isAuthenticated]);

  // ── NEW: iOS Safari foreground reconnection ──
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleForeground = () => {
      if (document.visibilityState === "visible" && userIdRef.current) {
        // Give iOS 300–800ms to restore network after unlock/foreground
        setTimeout(() => reconnectSocket(userIdRef.current!), 500);
      }
    };

    document.addEventListener("visibilitychange", handleForeground);
    window.addEventListener("pageshow", handleForeground);
    window.addEventListener("focus", handleForeground);

    return () => {
      document.removeEventListener("visibilitychange", handleForeground);
      window.removeEventListener("pageshow", handleForeground);
      window.removeEventListener("focus", handleForeground);
    };
  }, [isAuthenticated]);

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => {
    setIsAuthenticated(false);
    disconnectSocket();
    userIdRef.current = null;
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  };

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    return isAuthenticated ? <>{children}</> : <Navigate to="/welcome" />;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <div className={`app ${darkMode ? 'darkMode' : ''}`}>
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
                <WelcomeDashboard darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
              ) : (
                <Navigate to="/home" />
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
                <Navigate to="/home" />
              )
            }
          />
          <Route path="/home" element={<PrivateRoute><HomeDashboard darkMode={darkMode} /></PrivateRoute>} />
          <Route path="/power-supply" element={<PrivateRoute><PowerSupply darkMode={darkMode} /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings darkMode={darkMode} onToggleDarkMode={toggleDarkMode} handleSignOut={handleLogout} /></PrivateRoute>} />
          <Route path="/weather" element={<PrivateRoute><Weather darkMode={darkMode} /></PrivateRoute>} />
          <Route path="/strip-led" element={<PrivateRoute><StripLed darkMode={darkMode} /></PrivateRoute>} />
          <Route path="/camera" element={<PrivateRoute><Camera darkMode={darkMode} /></PrivateRoute>} />
          <Route path="/Notification" element={<PrivateRoute><NotificationDashboard darkMode={darkMode} /></PrivateRoute>} />
          <Route path="/device-data" element={<PrivateRoute><DeviceDataDashboard darkMode={darkMode} /></PrivateRoute>} />
          <Route path="/room-control" element={<PrivateRoute><RoomControl darkMode={darkMode} onToggleDarkMode={toggleDarkMode} /></PrivateRoute>} />
          <Route
            path="/Aichatbot"
            element={
              <PrivateRoute>
                <ChatDashboard darkMode={darkMode} />
              </PrivateRoute>
            }
          />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/home" : "/welcome"} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
