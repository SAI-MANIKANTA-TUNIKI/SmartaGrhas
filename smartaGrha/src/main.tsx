import React from "react";
import ReactDOM from "react-dom/client";
import './index.css';
import App from "./app"; // ✅ Import with uppercase name even if file is lowercase

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App /> {/* ✅ Must use uppercase component name */}
  </React.StrictMode>
);
