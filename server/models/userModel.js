import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  verifyOtp: {
    type: String,
    default: "",
  },
  verifyOtpExpiry: {
    type: Date,
    default: null,
  },
  isAccountVerified: {
    type: Boolean,
    default: false,
  },
  resetOtp: {
    type: String,
    default: "",
  },
  resetOtpExpiry: {
    type: Date,
    default: null,
  },
  profileImage: {
    type: String,
    default: "",
  },
  phoneNumber: {
    type: String,
    default: "",
  },
  bio: {
    type: String,
    default: "",
  },
  address: {
    type: String,
    default: "",
  },
  websiteLinks: {
    type: [String],
    default: [],
  },
});

const userModel = mongoose.models.User || mongoose.model("User", userSchema);
export default userModel;