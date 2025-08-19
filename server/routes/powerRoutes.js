//Server/routes/powerRoutes.js
import express from "express";
import { getPowerEntries, getRoomPowers, getDeviceStatuses } from "../controllers/powerController.js";
import userAuth from "../middleware/userAuth.js";

const powerRouter = express.Router();

powerRouter.get("/entries", userAuth, getPowerEntries);
powerRouter.get("/room-powers", userAuth, getRoomPowers);
powerRouter.get("/device-statuses", userAuth, getDeviceStatuses);

export default powerRouter;