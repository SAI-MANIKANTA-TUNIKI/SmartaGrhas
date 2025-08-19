// controllers/cameraController.js
import Camera from '../models/cameraModel.js';

export const getCameras = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: No user ID provided' });
    }
    const cameras = await Camera.find({ userId });
    console.log(`Fetched ${cameras.length} cameras for user ${userId}`);
    res.json(cameras);
  } catch (err) {
    console.error('Error fetching cameras:', err.message);
    res.status(500).json({ message: 'Server error while fetching cameras' });
  }
};

export const addCamera = async (req, res) => {
  const { name, ip } = req.body;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID provided' });
  }
  if (!name || !ip) {
    return res.status(400).json({ message: 'Camera name and IP are required' });
  }
  try {
    // Validate IP format
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({ message: 'Invalid IP address format' });
    }
    const newCamera = new Camera({ name, ip, userId });
    await newCamera.save();
    console.log(`Camera added: ${name} (${ip}) for user ${userId}`);
    res.status(201).json(newCamera);
  } catch (err) {
    console.error('Error adding camera:', err.message);
    res.status(400).json({ message: 'Failed to add camera' });
  }
};