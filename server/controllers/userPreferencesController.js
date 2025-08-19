//(server/controllers/userPreferencesController.js
import mongoose from "mongoose";
import userPreferencesModel from "../models/userPreferencesModel.js";

export const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user.userId; // From authMiddleware
    const preferences = await userPreferencesModel.findOne({ userId });
    res.json({
      success: true,
      disabledEventTypes: preferences ? preferences.disabledEventTypes : [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { disabledEventTypes } = req.body;
    const preferences = await userPreferencesModel.findOneAndUpdate(
      { userId },
      { disabledEventTypes },
      { upsert: true, new: true }
    );
    res.json({ success: true, disabledEventTypes: preferences.disabledEventTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get disabled event types for a user
export const getDisabledEventTypes = async (userId) => {
  try {
    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      console.warn(`Invalid userId provided for preferences: ${userId}`);
      return [];
    }

    const preferences = await userPreferencesModel.findOne({ userId });
    if (!preferences || !preferences.disabledEventTypes) {
      return []; // Return empty array if no preferences or disabled event types
    }
    return preferences.disabledEventTypes;
  } catch (error) {
    console.error(`Error fetching disabled event types for user ${userId}:`, error.message);
    return []; // Return empty array on error to prevent blocking notifications
  }
};

// Update disabled event types for a user
export const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id; // Assumes auth middleware sets req.user
    const { disabledEventTypes } = req.body;

    // Validate input
    if (!Array.isArray(disabledEventTypes)) {
      return res.status(400).json({ success: false, message: "disabledEventTypes must be an array" });
    }

    // Validate event types against allowed values
    const validEventTypes = [
      "DeviceStatus",
      "SensorUpdate",
      "ScheduleChange",
      "MotionDetected",
      "PowerMetric",
      "WeatherUpdate",
    ];
    const invalidTypes = disabledEventTypes.filter((type) => !validEventTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid event types: ${invalidTypes.join(", ")}`,
      });
    }

    // Update or create preferences
    const preferences = await userPreferencesModel.findOneAndUpdate(
      { userId },
      { disabledEventTypes },
      { upsert: true, new: true }
    );

    res.json({ success: true, preferences });
  } catch (error) {
    console.error("Error updating notification preferences:", error.message);
    res.status(500).json({ success: false, message: "Failed to update preferences" });
  }
};