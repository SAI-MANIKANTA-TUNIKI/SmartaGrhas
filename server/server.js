// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import http from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import connectDB from "./config/mongodb.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import cameraRouter from "./routes/cameraRoutes.js";
import roomRouter from "./routes/roomRoutes.js";
import sensorRouter from "./routes/sensorRoutes.js";
import deviceRouter from "./routes/deviceRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import userPreferencesRouter from "./routes/userPreferencesRoutes.js";
import powerRouter from "./routes/powerRoutes.js";
import { startScheduleChecker } from "./controllers/roomController.js";
import { createNotification } from "./controllers/notificationController.js";
import { startSensorDataCleanup } from "./controllers/sensorDataController.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import AWS from "aws-sdk";
import { mqtt, iot } from "aws-iot-device-sdk-v2";
import roomModel from "./models/roomModel.js";
import sensorDataModel from "./models/sensorDataModel.js";
import powerDataModel from "./models/powerDataModel.js";
import ledRouter from './routes/ledRoutes.js';
import { startNotificationCleanup } from "./controllers/notificationController.js";
import cameraModel from "./models/cameraModel.js"; // Added missing import

dotenv.config();

const app = express();
const server = http.createServer(app);

// UPDATED: Dynamic CORS for production
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.CLIENT_URL] 
  : ["http://localhost:5173"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  pingTimeout: 60000, // Increased to prevent idle disconnects on Render
  pingInterval: 25000,
});

const PORT = process.env.PORT || 5000;

// Validate environment variables
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_IOT_ENDPOINT) {
  console.error("Missing AWS environment variables");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET");
  process.exit(1);
}

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// File upload setup with AWS S3 (to handle ephemeral filesystem on Render)
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const upload = multer({
  storage: multer.memoryStorage(), // Use memory to buffer, then upload to S3
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG/PNG images are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME, // Add this env var in Render
    Key: `${Date.now()}${path.extname(req.file.originalname)}`,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
    ACL: 'public-read', // If you want public access
  };

  try {
    const data = await s3.upload(params).promise();
    res.status(200).json({ success: true, fileUrl: data.Location });
  } catch (err) {
    console.error("S3 upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// Dynamic proxy for camera streams
app.use('/stream', (req, res, next) => {
  const cameraIp = req.query.ip;
  if (!cameraIp) {
    return res.status(400).json({ message: 'Missing IP query parameter' });
  }
  const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/;
  if (!ipRegex.test(cameraIp)) {
    return res.status(400).json({ message: 'Invalid camera IP format' });
  }
  const target = `http://${cameraIp}`;
  console.log(`Proxying stream request to: ${target}/stream`);
  createProxyMiddleware({
    target: target,
    changeOrigin: true,
    pathRewrite: { '^/stream': '/stream' },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${target}/stream:`, err.message);
      res.status(500).json({ message: 'Failed to connect to camera stream', error: err.message });
    },
    onProxyRes: (proxyRes, req, res) => {
      proxyRes.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173';
      proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type';
      if (proxyRes.headers['content-type']?.includes('multipart/x-mixed-replace')) {
        res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=--myboundary');
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`Proxy request: ${req.method} ${req.url} -> ${target}/stream`);
    },
  })(req, res, next);
});

// Attach io to request
app.use((req, res, next) => {
  req.io = io;
  next();
});


// AWS setup
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const iotData = new AWS.IotData({ endpoint: process.env.AWS_IOT_ENDPOINT });

// MQTT connection
// Note: This assumes static AWS credentials. If using temporary credentials, include sessionToken.
const mqttConnection = () => {
  const config = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets()
    .with_endpoint(process.env.AWS_IOT_ENDPOINT)
    .with_credentials(
      process.env.AWS_REGION,
      process.env.AWS_ACCESS_KEY_ID,
      process.env.AWS_SECRET_ACCESS_KEY
    )
    .with_client_id(`server-${Date.now()}`)
    .build();

  const client = new mqtt.MqttClient();
  return client.new_connection(config);
};

// Subscribe to topics
const subscribeToRoomTopics = async (connection) => {
  try {
    const rooms = await roomModel.find();
    for (const room of rooms) {
      for (const device of room.devices) {
        const relayTopic = `/esp32/${room.device_id}/relay${device.relay_no}`;
        await connection.subscribe(relayTopic, mqtt.QoS.AtLeastOnce);
        console.log(`Subscribed to ${relayTopic}`);
      }
      const sensorTopic = `/esp32/dht11/${room.device_id}`;
      await connection.subscribe(sensorTopic, mqtt.QoS.AtLeastOnce);
      console.log(`Subscribed to ${sensorTopic}`);
    }
    await connection.subscribe("/camera/#", mqtt.QoS.AtLeastOnce);
    console.log("Subscribed to /camera/#");
    await connection.subscribe("/power/#", mqtt.QoS.AtLeastOnce);
    console.log("Subscribed to /power/#");
    await connection.subscribe("/weather/#", mqtt.QoS.AtLeastOnce);
    console.log("Subscribed to /weather/#");
  } catch (error) {
    console.error("MQTT subscription error:", error.message);
  }
};

// Handle MQTT messages
const handleMqttMessages = async () => {
  const connection = mqttConnection();

  connection.on("connect", async () => {
    console.log("MQTT connected");
    await subscribeToRoomTopics(connection);
  });

  connection.on("message", async (topic, payload) => {
    try {
      console.log(`Received MQTT message on topic: ${topic}`);
      let payloadString;
      if (payload instanceof ArrayBuffer) {
        payloadString = new TextDecoder("utf-8").decode(new Uint8Array(payload));
      } else {
        payloadString = payload.toString();
      }
      console.log(`Raw payload: ${payloadString}`);

      let data;
      try {
        data = JSON.parse(payloadString);
      } catch (parseError) {
        if (topic.includes("dht11")) {
          console.error(`Failed to parse payload as JSON: ${payloadString}`);
          const parts = payloadString.split(",").map((p) => p.trim());
          if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
            throw new Error(`Invalid sensor payload format: ${payloadString}`);
          }
          data = {
            temperature: parseFloat(parts[0]),
            humidity: parseFloat(parts[1]),
          };
        } else if (topic.includes("relay") && (payloadString === "ON" || payloadString === "OFF")) {
          data = { is_on: payloadString === "ON" };
        } else {
          console.error(`Invalid payload format for topic ${topic}: ${payloadString}`);
          return; // Skip invalid payloads
        }
      }

      const topicParts = topic.split("/");
      let notificationData;
      if (topicParts[1] === "esp32" && topicParts[2].startsWith("dht11")) {
        const device_id = topicParts[3];
        const { temperature, humidity } = data;
        if (
          typeof device_id !== "string" ||
          typeof temperature !== "number" ||
          typeof humidity !== "number" ||
          isNaN(temperature) ||
          isNaN(humidity) ||
          temperature < -40 ||
          temperature > 80 ||
          humidity < 0 ||
          humidity > 100
        ) {
          console.error(`Invalid sensor payload for topic ${topic}:`, data);
          return;
        }
        const room = await roomModel.findOne({ device_id });
        if (!room) {
          console.error(`Room not found for device_id: ${device_id}`);
          return;
        }
        if (!room.userId) {
          console.error(`No userId found for room with device_id: ${device_id}`);
          return;
        }
        const sensorData = new sensorDataModel({
          userId: room.userId,
          device_id,
          temperature,
          humidity,
          createdAt: new Date(),
        });
        await sensorData.save();
        console.log(
          `Saved sensor data: Device=${device_id}, Temp=${temperature}, Hum=${humidity}, Timestamp=${sensorData.createdAt}`
        );
        io.to(room.userId.toString()).emit("sensorData", { device_id, temperature, humidity });
        notificationData = {
          userId: room.userId,
          dashboard: "DeviceData",
          eventType: "SensorUpdate",
          description: `Temperature in ${room.name} changed to ${temperature}°C, Humidity to ${humidity}%`,
          device_id,
          metadata: { temperature, humidity },
        };
// Inside handleMqttMessages, replace the relay handling block with this:        
      } else if (topicParts[1] === "esp32" && topicParts[3].startsWith("relay")) {
        const device_id = topicParts[2];
        const relay_no = parseInt(topicParts[3].replace("relay", ""));
        const { is_on } = data;
  // Validate payload       
        if (typeof is_on !== "boolean" || isNaN(relay_no)) {
          console.error(`Invalid relay payload for topic ${topic}:`, data);
          return;
        }
  // Find the room with the specified device_id and relay_no       
        const room = await roomModel.findOne({ device_id, "devices.relay_no": relay_no });
        if (!room) {
          console.error(`Room not found for device_id: ${device_id}, relay_no: ${relay_no}`);
          return;
        }
 // Ensure room has a userId
if (!room.userId) {
    console.error(`No userId found for room with device_id: ${device_id}, relay_no: ${relay_no}`);
    return;
  }
  // Find the device within the room
   const device = room.devices.find((d) => d.relay_no === relay_no);
  if (!device) {
    console.error(`Device not found: Device=${device_id}, Relay=${relay_no}`);
    return;
  }
    // Check if the device state has changed
  if (device.is_on === is_on) {
    console.log(`State unchanged for Device=${device_id}, Relay=${relay_no}, is_on=${is_on}`);
    return;
  }
        
        if (device && device.is_on !== is_on) {
            // Update device state and save
          device.is_on = is_on;
          await room.save();
          // Emit device update via Socket.IO
          io.to(room.userId.toString()).emit("deviceUpdated", {
            userId: room.userId,
            roomId: room._id,
            device: { ...device, _id: device.relay_no },
          });
               // Create notification
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
              io.to(notification.userId.toString()).emit("notification", notification);
              console.log("Emitted notification:", notification);
             }
        } else {
          console.error(`Device not found: Device=${device_id}, Relay=${relay_no}`);
        }
      } else if (topicParts[1] === "camera") {
        const camera_id = topicParts[2];
        const camera = await cameraModel.findOne({ name: camera_id }); // Adjust based on your Camera model
        if (!camera) {
          console.error(`Camera not found for id: ${camera_id}`);
          return;
        }
        if (!camera.userId) {
          console.error(`No userId found for camera with id: ${camera_id}`);
          return;
        }
        const userId = camera.userId.toString();
        notificationData = {
          userId,
          dashboard: "Camera",
          eventType: "MotionDetected",
          description: `Motion detected on camera ${camera_id}`,
          device_id: camera_id,
          metadata: { camera_id },
        };
        const notification = await createNotification(notificationData);
        if (notification) {
          io.to(userId).emit("notification", notification);
          io.to(userId).emit("cameraUpdate", { camera_id, motion: true });
        }
        return;
      } else if (topicParts[1] === "power") {
        const device_id = topicParts[2];
        let { voltage = 220, current } = data;
        if (typeof voltage !== "number" || typeof current !== "number") {
          console.error(`Invalid power payload for topic ${topic}:`, data);
          return;
        }
        const room = await roomModel.findOne({ device_id });
        if (!room) {
          console.error(`Room not found for device_id: ${device_id}`);
          return;
        }
        if (!room.userId) {
          console.error(`No userId found for room with device_id: ${device_id}`);
          return;
        }
        const powerData = new powerDataModel({
          userId: room.userId,
          device_id,
          voltage,
          current,
        });
        await powerData.save();
        io.to(room.userId.toString()).emit("powerUpdate", { device_id, voltage, current, power: voltage * current });
        notificationData = {
          userId: room.userId,
          dashboard: "PowerSupply",
          eventType: "PowerMetric",
          description: `Power update for ${room.name}: Voltage ${voltage}V, Current ${current}A`,
          device_id,
          metadata: { voltage, current },
        };
      } else if (topicParts[1] === "weather") {
        const location = topicParts[2];
        const { temperature, condition } = data;
        if (typeof temperature !== "number" || typeof condition !== "string") {
          console.error(`Invalid weather payload for topic ${topic}:`, data);
          return;
        }
        const rooms = await roomModel.find();
        const userIds = [...new Set(rooms.map((room) => room.userId.toString()))];
        if (!userIds.length) {
          console.error(`No users found for weather notification on ${topic}`);
          return;
        }
        notificationData = {
          dashboard: "Weather",
          eventType: "WeatherUpdate",
          description: `Weather update in ${location}: Temperature ${temperature}°C, ${condition}`,
          metadata: { temperature, condition },
        };
        for (const userId of userIds) {
          const notification = await createNotification({ ...notificationData, userId });
          if (notification) {
            console.log(`Emitting weather notification to user ${userId}:`, notification);
            io.to(userId).emit("notification", notification);
            io.to(userId).emit("weatherUpdate", { location, temperature, condition });
          }
        }
        return;
      }else {
        console.error(`Unrecognized topic: ${topic}`);
        return;
      }

      if (notificationData) {
        const notification = await createNotification(notificationData);
        if (notification) {
          io.to(notification.userId.toString()).emit("notification", notification);
          console.log("Emitted notification:", notification);
        }
      }
    } catch (error) {
      console.error(`MQTT message error on topic ${topic}:`, error.message);
    }
  });

  connection.on("error", (error) => {
    console.error("MQTT connection error:", error);
  });

  connection.on("close", () => {
    console.log("MQTT connection closed");
  });

  connection.on("interrupt", () => {
    console.log("MQTT connection interrupted");
  });

  connection.connect().catch((error) => {
    console.error("MQTT connection failed:", error);
  });
};

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`Socket ${socket.id} joined room ${userId}`);
  });
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});


// Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/camera", cameraRouter);
app.use("/api/room", roomRouter);
app.use("/api/sensor", sensorRouter);
app.use("/api/devices", deviceRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/preferences", userPreferencesRouter);
app.use("/api/power", powerRouter);
app.use('/api/led', ledRouter);

// Schedule endpoint with notification
app.post("/api/schedule", async (req, res) => {
  try {
    const { device_id, relay_no, action, time } = req.body;
    const room = await roomModel.findOne({ device_id, "devices.relay_no": relay_no });
    if (!room) {
      return res.status(404).json({ success: false, message: "Device or room not found" });
    }
    const device = room.devices.find((d) => d.relay_no === relay_no);
    const description = `Schedule updated for ${device.type} in ${room.name} to ${action} at ${time}`;
    const notificationData = {
      dashboard: "RoomControl",
      eventType: "ScheduleChange",
      description,
      device_id,
      metadata: { relay_no, action, time },
      userId: room.userId,
    };
    const notification = await createNotification(notificationData);
    if (notification) {
      io.to(room.userId.toString()).emit("notification", notification);
    }
    return res.json({ success: true, message: "Schedule updated" });
  } catch (error) {
    console.error("Schedule update failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update schedule" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// MongoDB connection with error handling
const startServer = async () => {
  try {
    await connectDB();
// Start schedule checker
startScheduleChecker(io);
// Start sensor data cleanup
startSensorDataCleanup(); // Add this line
// Add this line to start notification cleanup
startNotificationCleanup();
// Start MQTT message handling
handleMqttMessages();

    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server due to MongoDB connection error:", error.message);
    process.exit(1);
  }
};

// Start the server
startServer();