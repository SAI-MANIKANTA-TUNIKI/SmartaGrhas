import mongoose from "mongoose";

const sensorDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  device_id: {
    type: String,
    required: true,
    trim: true,
  },
  temperature: {
    type: Number,
    required: true,
    min: [-40, "Temperature must be at least -40°C"],
    max: [80, "Temperature must not exceed 80°C"],
  },
  humidity: {
    type: Number,
    required: true,
    min: [0, "Humidity must be at least 0%"],
    max: [100, "Humidity must not exceed 100%"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

sensorDataSchema.index({ userId: 1, device_id: 1, createdAt: -1 });

const sensorDataModel = mongoose.models.SensorData || mongoose.model("SensorData", sensorDataSchema);
export default sensorDataModel;