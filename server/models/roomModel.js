import mongoose from "mongoose";
import crypto from "crypto";

const deviceSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true,
  },
  relay_no: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    validate: {
      validator: Number.isInteger,
      message: "relay_no must be an integer between 0 and 100",
    },
  },
  image_url: {
    type: String,
    required: true,
    trim: true,
  },
  is_on: {
    type: Boolean,
    default: false,
  },
});

const roomSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  esp32_ip: {
    type: String,
    required: true,
    trim: true,
    match: [/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, "Invalid IP address format"],
  },
  device_id: {
    type: String,
    required: true,
    trim: true,
  },
  device_key: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(16).toString("hex"),
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  image_url: {
    type: String,
    required: true,
    trim: true,
  },
  devices: [deviceSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

roomSchema.index({ userId: 1, name: 1 }, { unique: true });
roomSchema.index({ userId: 1, esp32_ip: 1 }, { unique: true });
roomSchema.index({ userId: 1, device_id: 1 }, { unique: true });
roomSchema.index({ device_id: 1, device_key: 1 });

const roomModel = mongoose.model("Room", roomSchema);
export default roomModel;