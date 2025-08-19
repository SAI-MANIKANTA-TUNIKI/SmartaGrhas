// backend/routes/cameraRoutes.js
import express from 'express';
import { getCameras, addCamera } from '../controllers/cameraController.js';
import authMiddleware from '../middleware/authMiddleware.js'; // Assuming you have this middleware

const router = express.Router();

router.get('/', authMiddleware, getCameras);
router.post('/', authMiddleware, addCamera);

export default router;