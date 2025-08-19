import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { getUserData, updateProfile } from '../controllers/userController.js';
import { upload } from '../middleware/upload.js'; // Assuming your existing upload.js

const userRouter = express.Router();
userRouter.get('/data', userAuth, getUserData);
userRouter.put('/profile', userAuth, upload.single('profileImage'), updateProfile);

export default userRouter;