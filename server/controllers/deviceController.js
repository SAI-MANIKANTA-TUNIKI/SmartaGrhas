import roomModel from "../models/roomModel.js";
import { check, validationResult } from "express-validator";
import authMiddleware from "../middleware/authMiddleware.js";

// Get device details
export const getDevice = [
  authMiddleware,
  check("roomId").isMongoId().withMessage("Invalid Room ID"),
  check("relay_no").isInt().withMessage("Relay number must be an integer").toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error("Validation errors in getDevice:", errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { relay_no } = req.params;
    const { roomId } = req.query;
    const userId = req.userId;

    try {
      const room = await roomModel.findOne({ _id: roomId, userId });
      if (!room) {
        console.error(`Room not found or user not authorized: roomId=${roomId}, userId=${userId}`);
        return res.status(403).json({ success: false, message: "Unauthorized or room not found" });
      }

      const device = room.devices.find((d) => d.relay_no === parseInt(relay_no));
      if (!device) {
        console.error(`Device not found: relay_no=${relay_no}, roomId=${roomId}`);
        return res.status(404).json({ success: false, message: "Device not found" });
      }

      return res.status(200).json({
        success: true,
        device: {
          _id: device.relay_no,
          name: device.type,
          status: device.is_on,
          image: device.image_url || process.env.DEFAULT_DEVICE_IMAGE || "https://source.unsplash.com/200x200/?device",
        },
      });
    } catch (error) {
      console.error(`Error fetching device ${relay_no}:`, error.message);
      return res.status(500).json({ success: false, message: "Error fetching device" });
    }
  },
];