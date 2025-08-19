//server/Models/userPreferencesModel.js
import mongoose from "mongoose";

const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  disabledEventTypes: {
    type: [String],
    default: [],
    enum: [
      "DeviceStatus",
      "SensorUpdate",
      "ScheduleChange",
      "MotionDetected",
      "PowerMetric",
      "WeatherUpdate",
    ],
  },
});

userPreferencesSchema.index({ userId: 1 });

const userPreferencesModel = mongoose.models.UserPreferences || mongoose.model("UserPreferences", userPreferencesSchema);
export default userPreferencesModel;