// Server/controllers/scheduleController.js
import express from "express";
import Schedule from "../models/scheduleModel.js";

// 🕒 Utility to check if a schedule is expired
const isExpired = (schedule) => {
  const now = new Date();
  return (
    schedule.off_time &&
    new Date(schedule.off_time).getTime() < now.getTime()
  );
};

// 🧹 Clear expired schedules
const clearExpiredSchedules = async () => {
  const expiredSchedules = await Schedule.find({
    off_time: { $lt: new Date() }
  });
  for (const schedule of expiredSchedules) {
    await Schedule.findByIdAndDelete(schedule._id);
  }
};

export const getSchedules = async (req, res) => {
  try {
    await clearExpiredSchedules(); // Remove old schedules
    const schedules = await Schedule.find();
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ message: "Error fetching schedules", error });
  }
};

export const addSchedule = async (req, res) => {
  const { device_id, on_time, off_time } = req.body;
  try {
    const schedule = new Schedule({ device_id, on_time, off_time });
    await schedule.save();
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ message: "Error adding schedule", error });
  }
};

export const updateSchedule = async (req, res) => {
  const { deviceId } = req.params;
  const { on_time, off_time } = req.body;
  try {
    const schedule = await Schedule.findOneAndUpdate(
      { device_id: deviceId },
      { on_time, off_time },
      { new: true }
    );
    res.status(200).json(schedule);
  } catch (error) {
    res.status(500).json({ message: "Error updating schedule", error });
  }
};

export const listSchedules = async (req, res) => {
  try {
    await clearExpiredSchedules(); // Auto-clear outdated entries
    const schedules = await Schedule.find().populate("room");
    const formatted = schedules.map((s) => ({
      esp32_ip: s.room?.esp32_ip,
      relay_no: s.relay_no,
      on_time: s.on_time?.toISOString() || null,
      off_time: s.off_time?.toISOString() || null
    }));
    res.json({ schedules: formatted });
  } catch (error) {
    res.status(500).json({ message: "Error listing schedules", error });
  }
};

export const triggerSchedule = (io) => async (req, res) => {
  const { esp32_ip, relay_no, is_on } = req.body;
  io.emit("scheduleTriggered", { esp32_ip, relay_no, is_on });
  res.json({ success: true });
};