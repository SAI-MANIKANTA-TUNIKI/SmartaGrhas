import jwt from "jsonwebtoken";

const userAuth = async (req, res, next) => {
  const { token } = req.cookies;
  console.log("Received token in userAuth:", token ? "Present" : "Missing");
  if (!token) {
    console.log("No token provided in request");
    return res.status(401).json({ success: false, message: "Not authorized, please login" });
  }
  try {
    const tokenDecoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", tokenDecoded);
    if (tokenDecoded.id) {
      req.userId = tokenDecoded.id;
      next();
    } else {
      console.log("Invalid token structure: missing id");
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export default userAuth;