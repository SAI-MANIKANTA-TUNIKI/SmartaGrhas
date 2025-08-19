import React, { createContext, useState, useEffect, type ReactNode } from "react";
import axios from "axios";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { name: string; email: string } | null;
  login: () => void;
  logout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const checkAuth = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/is-auth", {}, { withCredentials: true });
      if (res.data.success) {
        const userRes = await axios.get("http://localhost:5000/api/user/data", { withCredentials: true });
        setUser(userRes.data.userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = () => {
    setIsAuthenticated(true);
    checkAuth();
  };

  const logout = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/logout", {}, { withCredentials: true });
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem("token");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, darkMode, toggleDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
};