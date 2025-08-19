import express from "express";
import { getDevice } from "../controllers/deviceController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:relay_no", authMiddleware, getDevice);

export default router;