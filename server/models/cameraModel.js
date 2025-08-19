// Server/Models/Camera.js
import mongoose from 'mongoose';

const cameraSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ip: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Camera', cameraSchema);