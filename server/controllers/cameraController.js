// controllers/cameraController.js

import Camera from '../models/cameraModel.js';

export const getCameras = async (req, res) => {
  try {
    const cameras = await Camera.find({ userId: req.user.id });
    res.json(cameras);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addCamera = async (req, res) => {
  const { name, macAddress } = req.body;
  const userId = req.user.id;
  if (!name || !macAddress) return res.status(400).json({ message: 'Name and MAC are required' });

  try {
    const newCamera = new Camera({ name, macAddress, userId });
    await newCamera.save();
    res.status(201).json(newCamera);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'MAC address already exists' });
    res.status(400).json({ message: 'Failed to add camera' });
  }
};

export const updateCamera = async (req, res) => {
  try {
    const { name } = req.body;
    const camera = await Camera.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name },
      { new: true }
    );
    if (!camera) return res.status(404).json({ message: 'Camera not found' });
    res.json(camera);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update camera' });
  }
};

export const deleteCamera = async (req, res) => {
  try {
    const camera = await Camera.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!camera) return res.status(404).json({ message: 'Camera not found' });
    res.json({ message: 'Camera deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete camera' });
  }
};
