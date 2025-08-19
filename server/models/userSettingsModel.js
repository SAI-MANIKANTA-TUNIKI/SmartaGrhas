//server/Models/userSettingsModel.js
import mongoose from "mongoose";

const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  disabledEventTypes: {
    type: [String],
    default: [],
    enum: ["DeviceStatus", "SensorUpdate", "ScheduleChange", "MotionDetected", "PowerMetric", "WeatherUpdate"],
  },
});

const userSettingsModel = mongoose.model("UserSettings", userSettingsSchema);
export default userSettingsModel;