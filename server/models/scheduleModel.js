import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
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
  on_time: {
    type: Date,
    default: null,
  },
  off_time: {
    type: Date,
    default: null,
  },
});

scheduleSchema.index({ userId: 1, esp32_ip: 1, relay_no: 1 }, { unique: true });
scheduleSchema.index({ on_time: 1, off_time: 1 });

const scheduleModel = mongoose.model("Schedule", scheduleSchema);
export default scheduleModel;