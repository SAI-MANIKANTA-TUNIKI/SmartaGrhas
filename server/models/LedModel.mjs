import mongoose from 'mongoose';

const ledSchema = new mongoose.Schema({
  microcontrollerNumber: { type: String, required: true },
  ipAddress: { type: String, required: true },
  name: { type: String, required: true },
  color: {
    r: { type: Number, required: true },
    g: { type: Number, required: true },
    b: { type: Number, required: true },
  },
  brightness: { type: Number, required: true },
  effectSpeed: { type: Number, required: true },
  effectIntensity: { type: Number, required: true },
  power: { type: Boolean, required: true },
  effectMode: { type: String, required: true },
  syncMusic: { type: Boolean, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Led', ledSchema);