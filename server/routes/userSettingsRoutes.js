//server/routes/userSettingsRoutes.js

import express from "express";
import { getUserSettings, updateUserSettings } from "../controllers/userSettingsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getUserSettings);
router.put("/", authMiddleware, updateUserSettings);

export default router;