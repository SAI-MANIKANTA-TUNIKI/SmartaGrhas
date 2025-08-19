import express from "express";
import { saveSensorData, getSensorData, getLatestData } from "../controllers/sensorDataController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/report", saveSensorData);
router.get("/data/:deviceId", authMiddleware, getSensorData);
router.get("/latest", authMiddleware, getLatestData);

export default router;