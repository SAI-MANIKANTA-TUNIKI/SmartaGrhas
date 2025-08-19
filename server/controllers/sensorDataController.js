import sensorDataModel from "../models/sensorDataModel.js";
import { check, validationResult } from "express-validator";

// Save sensor data (used by HTTP endpoint)
export const saveSensorData = [
  check("device_id").notEmpty().withMessage("Device ID is required"),
  check("temperature").isFloat().withMessage("Temperature must be a number"),
  check("humidity").isFloat().withMessage("Humidity must be a number"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error("Validation errors in saveSensorData:", errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { device_id, temperature, humidity, timestamp } = req.body;
    try {
      const sensorData = new sensorDataModel({
        device_id,
        temperature,
        humidity,
        createdAt: timestamp ? new Date(timestamp) : new Date(),
      });
      await sensorData.save();
      console.log(
        `Saved sensor data via HTTP: Device=${device_id}, Temp=${temperature}, Hum=${humidity}, Timestamp=${sensorData.createdAt}`
      );
      req.io.emit("sensorData", { device_id, temperature, humidity });
      res.status(201).json({ success: true, message: "Sensor data saved", sensorData });
    } catch (error) {
      console.error("Error saving sensor data via HTTP:", error.message);
      res.status(500).json({ success: false, message: "Error saving sensor data", error: error.message });
    }
  },
];

// Fetch sensor data for a device (historical data)
export const getSensorData = async (req, res) => {
  const { deviceId } = req.params;
  try {
    const sensorData = await sensorDataModel
      .find({ device_id: deviceId })
      .sort({ createdAt: -1 })
      .limit(100);
    if (!sensorData.length) {
      console.warn(`No sensor data found for device_id: ${deviceId}`);
      return res.status(404).json({ success: false, message: "No sensor data found" });
    }
    res.status(200).json({ success: true, sensorData });
  } catch (error) {
    console.error(`Error fetching sensor data for device_id: ${deviceId}:`, error.message);
    res.status(500).json({ success: false, message: "Error fetching sensor data", error: error.message });
  }
};

// Fetch latest sensor data by device_id
export const getLatestData = async (req, res) => {
  const { device_id } = req.query;
  try {
    const data = await sensorDataModel
      .findOne({ device_id })
      .sort({ createdAt: -1 })
      .select("device_id temperature humidity createdAt");
    if (!data) {
      console.warn(`No sensor data found for device_id: ${device_id}`);
      return res.status(404).json({ success: false, message: "No sensor data found" });
    }
    console.log(`Fetched latest sensor data: Device=${device_id}, Temp=${data.temperature}, Hum=${data.humidity}`);
    res.status(200).json({ success: true, sensorData: data });
  } catch (error) {
    console.error(`Error fetching latest sensor data for device_id: ${device_id}:`, error.message);
    res.status(500).json({ success: false, message: "Error fetching sensor data", error: error.message });
  }
};

// Cleanup old sensor data (older than 1 minute)
export const cleanupOldSensorData = async () => {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000); // 1 minute ago
    const result = await sensorDataModel.deleteMany({
      createdAt: { $lt: oneMinuteAgo },
    });
    console.log(`Cleaned up ${result.deletedCount} sensor data records older than 1 minute`);
  } catch (error) {
    console.error("Error cleaning up old sensor data:", error.message);
  }
};

// Start periodic cleanup (runs every 30 seconds)
export const startSensorDataCleanup = () => {
  const interval = 30 * 1000; // Run every 30 seconds to avoid excessive database load
  setInterval(async () => {
    await cleanupOldSensorData();
  }, interval);
  console.log("Started sensor data cleanup process (runs every 30 seconds)");
};