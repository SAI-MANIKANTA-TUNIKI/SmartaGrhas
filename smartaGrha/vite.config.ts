// smartaGrha/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const API_BASE_URL = process.env.VITE_API_BASE_URL || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false,
      },
      // Proxy Socket.IO during local dev so iOS device on LAN works
      "/socket.io": {
        target: API_BASE_URL,
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
  build: {
    // iOS Safari 12+ requires es2020; anything newer breaks iOS
    target: "es2020",
    cssTarget: "safari14",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom", "socket.io-client"],
        },
      },
    },
  },
});
