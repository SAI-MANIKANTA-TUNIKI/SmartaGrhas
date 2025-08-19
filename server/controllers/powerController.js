//Server/controllers/powerController.js
import powerDataModel from "../models/powerDataModel.js";
import roomModel from "../models/roomModel.js";

const devicePowerMap = {
  TV: 100,
  Refrigerator: 150,
  Fan: 50,
  Heater: 1000,
  // Add more as needed
};

export const getPowerEntries = async (req, res) => {
  const userId = req.userId;
  const { timeRange = "day" } = req.query;

  let startDate = new Date();
  let dateGroup = {};

  switch (timeRange) {
    case "day":
      startDate.setDate(startDate.getDate() - 1);
      dateGroup = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
        hour: { $hour: "$createdAt" },
      };
      break;
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      dateGroup = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
      break;
    case "month":
      startDate.setDate(startDate.getDate() - 30);
      dateGroup = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
      break;
    case "year":
      startDate.setDate(startDate.getDate() - 365);
      dateGroup = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
      break;
    default:
      startDate.setDate(startDate.getDate() - 1);
      dateGroup = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
        hour: { $hour: "$createdAt" },
      };
  }

  try {
    const powerData = await powerDataModel.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: dateGroup,
          power_consumed: { $sum: "$power" },
          time_bucket: { $max: "$createdAt" },
        },
      },
      { $sort: { time_bucket: 1 } },
      {
        $project: {
          time_bucket: { $dateToString: { format: "%Y-%m-%d %H:%M", date: "$time_bucket" } },
          power_consumed: 1,
        },
      },
    ]);
    res.status(200).json({ success: true, powerData });
  } catch (error) {
    console.error("Get power entries error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getRoomPowers = async (req, res) => {
  const userId = req.userId;

  try {
    const latestPowers = await powerDataModel.aggregate([
      {
        $match: { userId },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$device_id",
          power_consumed: { $first: "$power" },
        },
      },
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "device_id",
          as: "room",
        },
      },
      { $unwind: "$room" },
      {
        $project: {
          room_name: "$room.name",
          power_consumed: 1,
        },
      },
    ]);
    res.status(200).json({ success: true, roomPowerData: latestPowers });
  } catch (error) {
    console.error("Get room powers error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getDeviceStatuses = async (req, res) => {
  const userId = req.userId;

  try {
    const rooms = await roomModel.find({ userId });
    const deviceStatuses = [];
    for (const room of rooms) {
      for (const device of room.devices) {
        const power_consumed = device.is_on ? (devicePowerMap[device.type] || 50) : 0;
        const status = device.is_on ? "Active" : "Inactive";
        deviceStatuses.push({
          room_name: room.name,
          device_name: device.type,
          power_consumed,
          status,
        });
      }
    }
    res.status(200).json({ success: true, deviceStatus: deviceStatuses });
  } catch (error) {
    console.error("Get device statuses error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};