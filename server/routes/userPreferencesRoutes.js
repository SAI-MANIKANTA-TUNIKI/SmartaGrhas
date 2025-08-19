//(server/routes/userPreferencesRoutes.js
import express from "express";
import { getUserPreferences, updateUserPreferences } from "../controllers/userPreferencesController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getUserPreferences);
router.put("/", authMiddleware, updateUserPreferences);

export default router;