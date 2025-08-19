//Server/Models/powerDataModel.js
import mongoose from "mongoose";

const powerDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  device_id: {
    type: String,
    required: true,
  },
  voltage: {
    type: Number,
    required: true,
  },
  current: {
    type: Number,
    required: true,
  },
  power: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

powerDataSchema.pre("save", function (next) {
  this.power = this.voltage * this.current;
  next();
});

powerDataSchema.index({ device_id: 1, createdAt: -1 });

const powerDataModel = mongoose.model("PowerData", powerDataSchema);
export default powerDataModel;