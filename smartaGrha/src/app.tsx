// src/App.tsx
import React, { useState, useEffect, type JSX } from "react";
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
import Camera from './components/pages/camear'; // Renamed to match component import
import RoomControl from './components/pages/roomControl';
import { getUserData } from './services/api'; // Your API function
import NotificationDashboard from "./components/pages/notification";
import DeviceDataDashboard from "./components/pages/deviceData";

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('darkMode') === 'true');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getUserData(); // Assume it throws if not authenticated
        setIsAuthenticated(true);
      } catch (error) {
        console.warn("User not authenticated", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  };

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const PrivateRoute = ({ children }: { children: JSX.Element }) => {
    return isAuthenticated ? children : <Navigate to="/welcome" />;
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
          <Route path="/camera" element={<PrivateRoute><Camera darkMode ={darkMode} /></PrivateRoute>} />
          <Route path="/Notification" element={<PrivateRoute><NotificationDashboard darkMode ={darkMode} /></PrivateRoute>} />
          <Route path="/device-data" element={<PrivateRoute><DeviceDataDashboard darkMode={darkMode} /></PrivateRoute>} />
          <Route path="/room-control" element={<PrivateRoute><RoomControl darkMode={darkMode} onToggleDarkMode={toggleDarkMode} /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile/></PrivateRoute>} />
          {/* Optional Routes */}
          {/* <Route path="/notification" element={<PrivateRoute><Notification /></PrivateRoute>} /> */}
          {/* <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} /> */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/home" : "/welcome"} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
