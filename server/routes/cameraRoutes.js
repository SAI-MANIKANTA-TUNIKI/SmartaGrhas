// backend/routes/cameraRoutes.js

import express from 'express';
import { getCameras, addCamera, updateCamera, deleteCamera } from '../controllers/cameraController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', authMiddleware, getCameras);
router.post('/', authMiddleware, addCamera);
router.put('/:id', authMiddleware, updateCamera);    
router.delete('/:id', authMiddleware, deleteCamera); 

export default router;
