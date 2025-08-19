import roomModel from "../models/roomModel.js";
import scheduleModel from "../models/scheduleModel.js";
import sensorDataModel from "../models/sensorDataModel.js";
import { check, validationResult } from "express-validator";
import AWS from "aws-sdk";
import { createNotification } from "./notificationController.js";


// AWS IoT MQTT configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const iot = new AWS.IotData({ endpoint: process.env.AWS_IOT_ENDPOINT });

// Publish relay state to MQTT with notification
const publishRelayState = async (device_id, relay_no, is_on, io, userId) => {
  try {
    if (!device_id || !Number.isInteger(relay_no)) {
      throw new Error("Invalid device_id or relay_no");
    }
    const topic = `/esp32/${device_id}/relay${relay_no}`;
    const payload = JSON.stringify({ is_on });
    await iot.publish({ topic, qos: 1, payload }).promise();
    console.log(`Published to ${topic}: ${payload}`);
    const notification = await createNotification({
      userId,
      dashboard: "RoomControl",
      eventType: "DeviceStatus",
      description: `Device ${device_id} relay ${relay_no} turned ${is_on ? "on" : "off"}`,
      device_id,
      metadata: { relay_no, is_on },
    });
    if (notification) {
      io.to(userId.toString()).emit("notification", notification);
    }
    return true;
  } catch (error) {
    console.error("MQTT publish error:", error.message);
    return false;
  }
};

// Server-side schedule checker
const checkSchedules = async (io) => {
  try {
    const now = new Date();
    const schedules = await scheduleModel.find({
      $or: [
        { on_time: { $lte: now }, off_time: { $gte: now } },
        { on_time: { $lte: now }, off_time: null },
        { off_time: { $lte: now } },
      ],
    });
    for (const schedule of schedules) {
      const room = await roomModel.findOne({
        userId: schedule.userId,
        esp32_ip: schedule.esp32_ip,
        "devices.relay_no": schedule.relay_no,
      });
      if (!room) continue;
      const device = room.devices.find((d) => d.relay_no === schedule.relay_no);
      if (!device) continue;
      let updated = false;
      if (schedule.on_time && new Date(schedule.on_time) <= now && !device.is_on) {
        device.is_on = true;
        updated = true;
        if (await publishRelayState(room.device_id, schedule.relay_no, true, io, schedule.userId)) {
          const notification = await createNotification({
            userId: schedule.userId,
            dashboard: "RoomControl",
            eventType: "ScheduleChange",
            description: `Device ${room.device_id} relay ${schedule.relay_no} turned on by schedule`,
            device_id: room.device_id,
            metadata: { relay_no: schedule.relay_no },
          });
          if (notification) {
            io.to(schedule.userId.toString()).emit("notification", notification);
          }
        }
      } else if (schedule.off_time && new Date(schedule.off_time) <= now) {
        if (device.is_on) {
          device.is_on = false;
          updated = true;
          if (await publishRelayState(room.device_id, schedule.relay_no, false, io, schedule.userId)) {
            const notification = await createNotification({
              userId: schedule.userId,
              dashboard: "RoomControl",
              eventType: "ScheduleChange",
              description: `Device ${room.device_id} relay ${schedule.relay_no} turned off by schedule`,
              device_id: room.device_id,
              metadata: { relay_no: schedule.relay_no },
            });
            if (notification) {
              io.to(schedule.userId.toString()).emit("notification", notification);
            }
          }
        }
        if (schedule.recurring) {
          schedule.on_time = new Date(schedule.on_time.getTime() + 24 * 60 * 60 * 1000);
          schedule.off_time = schedule.off_time
            ? new Date(schedule.off_time.getTime() + 24 * 60 * 60 * 1000)
            : null;
          await schedule.save();
        } else {
          await scheduleModel.deleteOne({
            _id: schedule._id,
            userId: schedule.userId,
            esp32_ip: schedule.esp32_ip,
            relay_no: schedule.relay_no,
          });
          io.to(schedule.userId.toString()).emit("scheduleDeleted", {
            userId: schedule.userId,
            esp32_ip: schedule.esp32_ip,
            relay_no: schedule.relay_no,
          });
          console.log(`Deleted schedule for relay ${schedule.relay_no} on ${schedule.esp32_ip}`);
        }
      }
      if (updated) {
        await room.save();
        io.to(schedule.userId.toString()).emit("deviceUpdated", {
          userId: schedule.userId,
          roomId: room._id,
          device,
        });
      }
    }
  } catch (error) {
    console.error("Schedule check error:", error.message);
  }
};

// Start schedule checker
export const startScheduleChecker = (io) => {
  const interval = parseInt(process.env.SCHEDULE_CHECK_INTERVAL) || 30000;
  setInterval(() => checkSchedules(io), interval);
};


// Add room
export const addRoom = [
  check("name").notEmpty().withMessage("Room name is required"),
  check("esp32_ip")
    .notEmpty()
    .withMessage("ESP32 IP is required")
    .matches(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
    .withMessage("Invalid IP address format"),
  check("device_id").notEmpty().withMessage("Device ID is required"),
  check("image_url").notEmpty().withMessage("Image URL is required"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, esp32_ip, device_id, image_url } = req.body;
    const userId = req.userId;

    try {
      const existingRoom = await roomModel.findOne({ userId, esp32_ip });
      if (existingRoom) {
        return res.status(400).json({ success: false, message: "ESP32 IP already associated with another room" });
      }

      const room = new roomModel({
        userId,
        esp32_ip,
        device_id,
        name,
        image_url,
        devices: [],
      });
      await room.save();

      req.io.to(userId.toString()).emit("roomAdded", { userId, room });
      res.status(201).json({ success: true, message: "Room added successfully", room });
    } catch (error) {
      console.error("Add room error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
];

// Get rooms
export const getRooms = async (req, res) => {
  try {
    const userId = req.userId;
    const rooms = await roomModel.find({ userId });
    res.status(200).json({ success: true, rooms });
  } catch (error) {
    console.error("Get rooms error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get rooms with latest sensor data
export const getRoomWithSensorData = async (req, res) => {
  try {
    const userId = req.userId;
    const rooms = await roomModel.find({ userId });
    const roomsWithSensorData = await Promise.all(
      rooms.map(async (room) => {
        const latestSensorData = await sensorDataModel
          .findOne({ userId, device_id: room.device_id })
          .sort({ createdAt: -1 })
          .select("temperature humidity createdAt");
        return {
          ...room.toObject(),
          temperature: latestSensorData ? latestSensorData.temperature : null,
          humidity: latestSensorData ? latestSensorData.humidity : null,
          lastSensorUpdate: latestSensorData ? latestSensorData.createdAt : null,
        };
      })
    );
    res.status(200).json({ success: true, rooms: roomsWithSensorData });
  } catch (error) {
    console.error("Get rooms with sensor data error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update room
export const updateRoom = [
  check("name").notEmpty().withMessage("Room name is required"),
  check("device_id").notEmpty().withMessage("Device ID is required"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { roomId } = req.params;
    const { name, device_id } = req.body;
    const userId = req.userId;

    try {
      const room = await roomModel.findOne({ _id: roomId, userId });
      if (!room) {
        return res.status(404).json({ success: false, message: "Room not found" });
      }

      if (name !== room.name) {
        const existingRoom = await roomModel.findOne({ userId, name });
        if (existingRoom) {
          return res.status(400).json({ success: false, message: "Room name already exists" });
        }
      }

      room.name = name;
      room.device_id = device_id;
      await room.save();

      req.io.to(userId.toString()).emit("roomUpdated", { userId, room });
      res.status(200).json({ success: true, message: "Room updated successfully", room });
    } catch (error) {
      console.error("Update room error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
];

// Delete room
export const deleteRoom = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.userId;

  try {
    const room = await roomModel.findOneAndDelete({ _id: roomId, userId });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    await scheduleModel.deleteMany({ userId, esp32_ip: room.esp32_ip });
    req.io.to(userId.toString()).emit("roomDeleted", { userId, roomId });
    res.status(200).json({ success: true, message: "Room deleted successfully" });
  } catch (error) {
    console.error("Delete room error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Add device
export const addDevice = [
  check("room_id").notEmpty().withMessage("Room ID is required"),
  check("type").notEmpty().withMessage("Device type is required"),
  check("relay_no")
    .isInt({ min: 0, max: 100 })
    .withMessage("Relay number must be an integer between 0 and 100"),
  check("image_url").notEmpty().withMessage("Image URL is required"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { room_id, type, relay_no, image_url, is_on = false } = req.body;
    const userId = req.userId;

    try {
      const room = await roomModel.findOne({ _id: room_id, userId });
      if (!room) {
        return res.status(404).json({ success: false, message: "Room not found" });
      }

      const existingDevice = room.devices.find((d) => d.relay_no === relay_no);
      if (existingDevice) {
        return res.status(400).json({ success: false, message: "Relay number already assigned" });
      }

      const device = { type, relay_no, image_url, is_on };
      room.devices.push(device);
      await room.save();

      await publishRelayState(room.device_id, relay_no, is_on);

      req.io.to(userId.toString()).emit("deviceAdded", { userId, roomId: room_id, device });
      res.status(201).json({ success: true, message: "Device added successfully", device });
    } catch (error) {
      console.error("Add device error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
];

// Update device
export const updateDevice = [
  check("type").optional().notEmpty().withMessage("Device type cannot be empty"),
  check("image_url").optional().notEmpty().withMessage("Image URL cannot be empty"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { relay_no } = req.params;
    const { type, image_url, is_on } = req.body;
    const userId = req.userId;

    try {
      const room = await roomModel.findOne({ userId, "devices.relay_no": parseInt(relay_no) });
      if (!room) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }

      const device = room.devices.find((d) => d.relay_no === parseInt(relay_no));
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }

let changed = false;
      if (type) device.type = type;
      if (image_url) device.image_url = image_url;
      if (typeof is_on === "boolean" && device.is_on !== is_on) {
        device.is_on = is_on;
        changed = true;
        await publishRelayState(room.device_id, parseInt(relay_no), is_on, req.io, userId);
      }

      if (changed || type || image_url) {
        await room.save();
        req.io.to(userId.toString()).emit("deviceUpdated", { userId, roomId: room._id, device });

        if (changed) {
          const notificationData = {
            userId,
            dashboard: "RoomControl",
            eventType: "DeviceStatus",
            description: `${device.type} in ${room.name} turned ${is_on ? "ON" : "OFF"}`,
            device_id: room.device_id,
            metadata: { relay_no: parseInt(relay_no), is_on },
          };
          const notification = await createNotification(notificationData);
          if (notification) {
            req.io.to(userId.toString()).emit("notification", notification);
          }
        }
      } else {
        console.log(`State unchanged for Device=${room.device_id}, Relay=${relay_no}, is_on=${is_on}`);
      }
      await room.save();
      req.io.to(userId.toString()).emit("deviceUpdated", { userId, roomId: room._id, device });
      res.status(200).json({ success: true, message: "Device updated successfully", device });
    } catch (error) {
      console.error("Update device error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
];

// Delete device
export const deleteDevice = async (req, res) => {
  const { relay_no } = req.params;
  const userId = req.userId;

  try {
    const room = await roomModel.findOne({ userId, "devices.relay_no": parseInt(relay_no) });
    if (!room) {
      return res.status(404).json({ success: false, message: "Device not found" });
    }

    room.devices = room.devices.filter((d) => d.relay_no !== parseInt(relay_no));
    await room.save();
    await scheduleModel.deleteOne({ userId, esp32_ip: room.esp32_ip, relay_no: parseInt(relay_no) });

    req.io.to(userId.toString()).emit("deviceDeleted", { userId, relay_no: parseInt(relay_no) });
    res.status(200).json({ success: true, message: "Device deleted successfully" });
  } catch (error) {
    console.error("Delete device error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Add schedule
export const addSchedule = [
  check("esp32_ip")
    .notEmpty()
    .withMessage("ESP32 IP is required")
    .matches(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
    .withMessage("Invalid IP address format"),
  check("relay_no")
    .isInt({ min: 0, max: 100 })
    .withMessage("Relay number must be an integer between 0 and 100"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { esp32_ip, relay_no, on_time, off_time } = req.body;
    const userId = req.userId;

    try {
      const room = await roomModel.findOne({
        userId,
        esp32_ip,
        "devices.relay_no": parseInt(relay_no),
      });
      if (!room) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }

      const existingSchedule = await scheduleModel.findOne({
        userId,
        esp32_ip,
        relay_no: parseInt(relay_no),
      });
      if (existingSchedule) {
        return res.status(400).json({ success: false, message: "Schedule already exists for this relay" });
      }

      const schedule = new scheduleModel({
        userId,
        esp32_ip,
        relay_no: parseInt(relay_no),
        on_time: on_time ? new Date(on_time) : null,
        off_time: off_time ? new Date(off_time) : null,
      });
      await schedule.save();

      req.io.to(userId.toString()).emit("scheduleUpdated", { schedule });
      res.status(201).json({ success: true, message: "Schedule added successfully", schedule });
    } catch (error) {
      console.error("Add schedule error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
];

// Update schedule
export const updateSchedule = [
  check("esp32_ip")
    .notEmpty()
    .withMessage("ESP32 IP is required")
    .matches(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
    .withMessage("Invalid IP address format"),
  check("relay_no")
    .isInt({ min: 0, max: 100 })
    .withMessage("Relay number must be an integer between 0 and 100"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { relay_no } = req.params;
    const { esp32_ip, on_time, off_time } = req.body;
    const userId = req.userId;

    try {
      const schedule = await scheduleModel.findOne({
        userId,
        esp32_ip,
        relay_no: parseInt(relay_no),
      });
      if (!schedule) {
        return res.status(404).json({ success: false, message: "Schedule not found" });
      }

      schedule.on_time = on_time ? new Date(on_time) : null;
      schedule.off_time = off_time ? new Date(off_time) : null;
      await schedule.save();

      req.io.to(userId.toString()).emit("scheduleUpdated", { schedule });
      res.status(200).json({ success: true, message: "Schedule updated successfully", schedule });
    } catch (error) {
      console.error("Update schedule error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
];

// Delete schedule
export const deleteSchedule = async (req, res) => {
  const { relay_no } = req.params;
  const { esp32_ip } = req.query;
  const userId = req.userId;

  try {
    const schedule = await scheduleModel.findOneAndDelete({
      userId,
      esp32_ip,
      relay_no: parseInt(relay_no),
    });
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found" });
    }

    req.io.to(userId.toString()).emit("scheduleDeleted", { relay_no: parseInt(relay_no), esp32_ip });
    res.status(200).json({ success: true, message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Delete schedule error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get schedules
export const getSchedules = async (req, res) => {
  try {
    const userId = req.userId;
    const schedules = await scheduleModel.find({ userId });
    res.status(200).json({ success: true, schedules });
  } catch (error) {
    console.error("Get schedules error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Report sensor data
export const reportSensorData = [
  check("device_id").notEmpty().withMessage("Device ID is required"),
  check("device_key").notEmpty().withMessage("Device key is required"),
  check("temperature").isFloat({ min: -40, max: 100 }).withMessage("Temperature must be between -40°C and 80°C"),
  check("humidity").isFloat({ min: 0, max: 100 }).withMessage("Humidity must be between 0% and 100%"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error("Validation errors in reportSensorData:", errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { device_id, device_key, temperature, humidity, timestamp } = req.body;

    try {
      const room = await roomModel.findOne({ device_id, device_key });
      if (!room) {
        console.error(`Room not found or invalid key: device_id=${device_id}`);
        return res.status(403).json({ success: false, message: "Unauthorized or device not found" });
      }

      const sensorData = new sensorDataModel({
        userId: room.userId,
        device_id,
        temperature,
        humidity,
        createdAt: timestamp ? new Date(timestamp) : new Date(),
      });
      await sensorData.save();

      req.io.to(room.userId.toString()).emit("sensorData", { device_id, temperature, humidity });

      const notificationData = {
        userId: room.userId,
        dashboard: "DeviceData",
        eventType: "SensorUpdate",
        description: `Temperature in ${room.name} changed to ${temperature}°C, Humidity to ${humidity}%`,
        device_id,
        metadata: { temperature, humidity },
      };
      const notification = await createNotification(notificationData);
      if (notification) {
        req.io.to(room.userId.toString()).emit("notification", notification);
      }

      res.status(201).json({ success: true, message: "Sensor data received", sensorData });
    } catch (error) {
      console.error("Sensor data error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
];

// Report device status
export const reportDeviceStatus = [
  check("device_id").notEmpty().withMessage("Device ID is required"),
  check("device_key").notEmpty().withMessage("Device key is required"),
  check("relay_no").isInt({ min: 0, max: 100 }).withMessage("Relay number must be an integer between 0 and 100"),
  check("is_on").isBoolean().withMessage("is_on must be a boolean"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error("Validation errors in reportDeviceStatus:", errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { device_id, device_key, relay_no, is_on } = req.body;

    try {
      const room = await roomModel.findOne({ device_id, device_key, "devices.relay_no": parseInt(relay_no) });
      if (!room) {
        console.error(`Room not found or invalid key: device_id=${device_id}, relay_no=${relay_no}`);
        return res.status(403).json({ success: false, message: "Unauthorized or device not found" });
      }

      const device = room.devices.find((d) => d.relay_no === parseInt(relay_no));
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }

      device.is_on = is_on;
      await room.save();

      req.io.to(room.userId.toString()).emit("deviceUpdated", {
        userId: room.userId,
        roomId: room._id,
        device,
      });

      const notificationData = {
        userId: room.userId,
        dashboard: "RoomControl",
        eventType: "DeviceStatus",
        description: `${device.type} in ${room.name} turned ${is_on ? "ON" : "OFF"}`,
        device_id,
        metadata: { relay_no, is_on },
      };
      const notification = await createNotification(notificationData);
      if (notification) {
        req.io.to(room.userId.toString()).emit("notification", notification);
      }

      res.status(200).json({ success: true, message: "Device status updated" });
    } catch (error) {
      console.error("Device status error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
];

// Trigger schedule
export const triggerSchedule = [
  check("esp32_ip")
    .notEmpty()
    .withMessage("ESP32 IP is required")
    .matches(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
    .withMessage("Invalid IP address format"),
  check("relay_no")
    .isInt({ min: 0, max: 100 })
    .withMessage("Relay number must be an integer between 0 and 100"),
  check("is_on").isBoolean().withMessage("is_on must be a boolean"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { esp32_ip, relay_no, is_on } = req.body;
    const userId = req.userId;

    try {
      const room = await roomModel.findOne({ userId, esp32_ip, "devices.relay_no": parseInt(relay_no) });
      if (!room) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }

      const device = room.devices.find((d) => d.relay_no === parseInt(relay_no));
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }

      await publishRelayState(room.device_id, parseInt(relay_no), is_on);
      device.is_on = is_on;
      await room.save();

      req.io.to(userId.toString()).emit("scheduleTriggered", { esp32_ip, relay_no, is_on });
      req.io.to(userId.toString()).emit("deviceUpdated", { userId, roomId: room._id, device });

      const notificationData = {
        userId,
        dashboard: "RoomControl",
        eventType: "ScheduleChange",
        description: `Manual schedule triggered: ${device.type} in ${room.name} turned ${is_on ? "ON" : "OFF"}`,
        device_id: room.device_id,
        metadata: { relay_no, is_on },
      };
      const notification = await createNotification(notificationData);
      if (notification) {
        req.io.to(userId.toString()).emit("notification", notification);
      }

      res.json({ success: true, message: "Schedule triggered" });
    } catch (error) {
      console.error("Trigger schedule error:", error.message);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
];



