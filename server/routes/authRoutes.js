// routes/authRoute.js or routes/authRoute.ts (TypeScript)

// server/routes/authRoute.js
// Server-side: routes/authRoute.js
import express from 'express';
import {
  login,
  register,
  logout,
  sendVerifyOtp,
  verifyEmail,
  isAuthenticated,
  sendResetOtp,
  resetPassword,
} from '../controllers/authController.js';
import userAuth from '../middleware/userAuth.js';

const authRouter = express.Router();
// Public Routes
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/send-reset-otp', sendResetOtp);
authRouter.post('/reset-password', resetPassword);
// Protected Routes
authRouter.post('/send-verify-otp', userAuth, sendVerifyOtp);
authRouter.post('/verify-account', userAuth, verifyEmail);
authRouter.post('/is-auth', userAuth, isAuthenticated);

export default authRouter;


/*import express from 'express';
import { login, register, logout, sendVerifyOtp, verifyEmail, isAuthenticated, sendResetOtp, resetPassword } from '../controllers/authController.js';
import userAuth from '../middleware/userAuth.js';
const authRoute = express.Router();
authRoute.post('/register', register);
authRoute.post('/login', login);
authRoute.post('/logout', logout);
authRoute.post('/send-verify-otp', userAuth, sendVerifyOtp);
authRoute.post('/verify-account', userAuth, verifyEmail);
authRoute.post('/is-auth', userAuth, isAuthenticated);
authRoute.post('/send-reset-otp', sendResetOtp);
authRoute.post('/reset-password', resetPassword);
export default authRoute;
*/

