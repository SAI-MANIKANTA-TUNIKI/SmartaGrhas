//server/controllers/userSettingsController.js
//../Models/userSettingsModel.js
import userSettingsModel from "../models/userSettingsModel.js";

export const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id; // From authMiddleware
    const settings = await userSettingsModel.findOne({ userId });
    res.json({
      success: true,
      disabledEventTypes: settings ? settings.disabledEventTypes : [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { disabledEventTypes } = req.body;
    const settings = await userSettingsModel.findOneAndUpdate(
      { userId },
      { disabledEventTypes },
      { upsert: true, new: true }
    );
    res.json({ success: true, disabledEventTypes: settings.disabledEventTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserDisabledEventTypes = async (userId) => {
  try {
    const settings = await userSettingsModel.findOne({ userId });
    return settings ? settings.disabledEventTypes : [];
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return [];
  }
};