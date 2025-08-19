//Server/Models/notificationModel.js
import mongoose from "mongoose";
import sanitizeHtml from "sanitize-html";

const notificationSchema = new mongoose.Schema({
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  
  dashboard: {
    type: String,
    required: true,
    enum: ["DeviceData", "RoomControl", "Camera", "PowerSupply", "Weather"],
  },
  eventType: {
    type: String,
    required: true,
    enum: ["DeviceStatus", "SensorUpdate", "ScheduleChange", "MotionDetected", "PowerMetric", "WeatherUpdate"],
  },
  description: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  device_id: {
    type: String,
    required: false,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});

notificationSchema.pre("save", function (next) {
  if (this.description) {
    this.description = sanitizeHtml(this.description);
  }
  next();
});

notificationSchema.index({ userId: 1, timestamp: -1 });
notificationSchema.index({ dashboard: 1 });
notificationSchema.index({ eventType: 1 });

const notificationModel = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
export default notificationModel;