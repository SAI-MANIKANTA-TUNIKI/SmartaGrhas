import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// Load environment variables
const API_BASE_URL = process.env.VITE_API_BASE_URL || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // expose to LAN if needed
    port: 5173,
    proxy: {
      "/api": {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false, // use false for local dev (http)
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // allow bigger chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"], // split vendor libs
        },
      },
    },
  },
});





{/*import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});*/}