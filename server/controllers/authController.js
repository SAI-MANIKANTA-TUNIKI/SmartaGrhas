// Server-side: controllers/authController.js
import userModel from "../models/userModel.js"; // Adjusted to lowercase 'models' assuming standard naming
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer.js"; // Adjusted to lowercase 'config'

export const register = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please fill all the fields" });
    }

    try {
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new userModel({
            name,
            email,
            password: hashedPassword,
        });

        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d",
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        // Send verification email
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Verify your email",
            text: `Welcome to Website. Your account has been created with email ID: ${email}`
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("Verification email sent:", info.response); // Log for debugging
        } catch (emailError) {
            console.error("Email sending failed:", emailError); // Log exact error
            return res.status(500).json({ success: false, message: "User registered but email failed to send" });
        }

        return res.status(201).json({ success: true, message: "User registered successfully" });

    } catch (error) {
        console.error("Registration failed:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Please fill all the fields" });
    }

    try {
        const user = await userModel.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d",
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({ success: true, message: "User logged in successfully" });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const logout = (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });
        res.status(200).json({ success: true, message: "User logged out successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const sendVerifyOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await userModel.findById(userId);
    if (user.isAccountVerified) {
      return res.status(400).json({ success: false, message: "Account already verified" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.verifyOtp = otp;
    user.verifyOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Verify your email",
      text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) {
    return res.json({ success: false, message: "Please provide userId and OTP" });
  }
  try {
    const user = await userModel.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.isAccountVerified) return res.status(400).json({ message: "Account already verified" });
    if (user.verifyOtp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (new Date() > user.verifyOtpExpiry) return res.status(400).json({ message: "OTP expired" });
    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpiry = null;
    await user.save();
    return res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const sendResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Please provide email" });
  }
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Reset your password",
      text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, password } = req.body; // Changed from newPassword to password for consistency with client
  if (!email || !otp || !password) {
    return res.status(400).json({ success: false, message: "Please fill all the fields" });
  }
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }
    if (user.resetOtp === "" || user.resetOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    if (new Date() > user.resetOtpExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpExpiry = null;
    await user.save();
    return res.status(200).json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const isAuthenticated = async (req, res) => {
    try {
        return res.json({ success: true, message: "User is authenticated" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};