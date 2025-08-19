import express from "express";
import {
  addRoom,
  getRooms,
  getRoomWithSensorData,
  updateRoom,
  deleteRoom,
  addDevice,
  updateDevice,
  deleteDevice,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedules,
  reportSensorData,
  reportDeviceStatus,
  triggerSchedule,
} from "../controllers/roomController.js";
import userAuth from "../middleware/userAuth.js";

const roomRouter = express.Router();

roomRouter.post("/add", userAuth, addRoom);
roomRouter.get("/list", userAuth, getRooms);
roomRouter.get("/list-with-sensor-data", userAuth, getRoomWithSensorData);
roomRouter.put("/update/:roomId", userAuth, updateRoom);
roomRouter.delete("/delete/:roomId", userAuth, deleteRoom);
roomRouter.post("/device/add", userAuth, addDevice);
roomRouter.put("/device/update/:relay_no", userAuth, updateDevice);
roomRouter.delete("/device/delete/:relay_no", userAuth, deleteDevice);
roomRouter.post("/schedule/add", userAuth, addSchedule);
roomRouter.put("/schedule/update/:relay_no", userAuth, updateSchedule);
roomRouter.delete("/schedule/delete/:relay_no", userAuth, deleteSchedule);
roomRouter.get("/schedule/list", userAuth, getSchedules);
roomRouter.post("/sensor/report", reportSensorData);
roomRouter.post("/device/status", reportDeviceStatus);
roomRouter.post("/schedule/trigger", userAuth, triggerSchedule);

export default roomRouter;