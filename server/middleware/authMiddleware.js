//middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Make user data available to next handlers
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};
export default verifyToken;
