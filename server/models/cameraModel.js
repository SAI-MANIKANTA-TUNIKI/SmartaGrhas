// Server/Models/Camera.js
import mongoose from 'mongoose';

const cameraSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ip: { type: String, default: "0.0.0.0" }, 
  macAddress: { type: String, required: true, unique: true }, 
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Camera', cameraSchema);
