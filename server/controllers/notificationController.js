import mongoose from "mongoose";
import notificationModel from "../models/notificationModel.js";
import { getDisabledEventTypes } from "../controllers/userPreferencesController.js";

export const getNotifications = async (req, res) => {
  try {
    const { dashboard, eventType, limit = 50 } = req.query;
    const userId = req.user.id; // Ensure this is req.user.id (from authMiddleware)
    const disabledEventTypes = await getDisabledEventTypes(userId);
    const query = { userId };
    if (dashboard) query.dashboard = dashboard;
    if (eventType) query.eventType = eventType;
    if (disabledEventTypes.length > 0) {
      query.eventType = { $nin: disabledEventTypes };
    }
    const notifications = await notificationModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNotification = async (notificationData) => {
  try {
    const { userId, eventType } = notificationData; // Destructure here for safety
    if (!userId) {
      throw new Error("userId is required in notificationData");
    }
    const disabledEventTypes = await getDisabledEventTypes(userId);
    if (disabledEventTypes.includes(eventType)) {
      console.log(`Notification suppressed for eventType: ${eventType}`);
      return null;
    }
    const notification = new notificationModel(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

export const cleanupOldNotification = async () => {
  try {
    // Get all unique userIds from notifications
    const users = await notificationModel.distinct("userId");

    // Check if there are no users with notifications
    if (!users || users.length === 0) {
      console.log("No notifications found in the database, skipping cleanup");
      return 0; // Return 0 to indicate no deletions
    }

    let totalDeleted = 0;

    // Iterate through each user
    for (const userId of users) {
      try {
        // Validate userId to prevent processing invalid data
        if (!mongoose.isValidObjectId(userId)) {
          console.warn(`Skipping invalid userId: ${userId}`);
          continue;
        }

        // Count notifications for the user
        const notificationCount = await notificationModel.countDocuments({ userId });

        // If more than 5 notifications exist for the user
        if (notificationCount > 5) {
          // Find notifications, sort by timestamp (oldest first), and skip the 5 most recent
          const notificationsToDelete = await notificationModel
            .find({ userId })
            .sort({ timestamp: 1 }) // Oldest first
            .skip(5); // Keep the 5 most recent

          // Check if there are notifications to delete
          if (notificationsToDelete.length === 0) {
            console.log(`No notifications to delete for user ${userId} after skip`);
            continue;
          }

          // Get the IDs of notifications to delete
          const idsToDelete = notificationsToDelete.map((notification) => notification._id);

          // Delete the older notifications
          const result = await notificationModel.deleteMany({
            _id: { $in: idsToDelete },
          });

          totalDeleted += result.deletedCount;
          console.log(`Cleaned up ${result.deletedCount} old notifications for user ${userId}`);
        } else {
          console.log(`User ${userId} has ${notificationCount} notifications, no cleanup needed`);
        }
      } catch (userError) {
        console.error(`Error processing cleanup for user ${userId}:`, userError.message);
        // Continue to the next user instead of crashing
      }
    }

    console.log(`Total cleaned up ${totalDeleted} notification records across ${users.length} users`);
    return totalDeleted; // Return total deleted count for logging or monitoring
  } catch (error) {
    console.error("Error in notification cleanup process:", error.message);
    // Log the error but don't crash; return 0 to indicate no deletions
    return 0;
  }
};

// Start periodic cleanup (runs every 30 seconds)
export const startNotificationCleanup = () => {
  const interval = 30 * 1000; // 30 seconds
  // Run cleanup immediately on startup
  cleanupOldNotification().catch((error) => {
    console.error("Initial notification cleanup failed:", error.message);
  });
  // Schedule periodic cleanup
  setInterval(async () => {
    await cleanupOldNotification();
  }, interval);
  console.log("Started notification cleanup process (runs every 30 seconds)");
};