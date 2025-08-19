import userModel from "../models/userModel.js";

export const getUserData = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({
      success: true,
      userData: {
        name: user.name,
        email: user.email,
        isAccountVerified: user.isAccountVerified,
        profileImage: user.profileImage,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        address: user.address,
        websiteLinks: user.websiteLinks,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { phoneNumber, bio, address } = req.body;
    let websiteLinks = req.body['websiteLinks[]'] || [];
    if (!Array.isArray(websiteLinks)) {
      websiteLinks = [websiteLinks];
    }
    let profileImage = req.body.profileImage; // Existing if no new upload

    if (req.file) {
      profileImage = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    const updateData = {
      phoneNumber,
      bio,
      address,
      websiteLinks,
      ...(profileImage && { profileImage }),
    };

    const updatedUser = await userModel.findByIdAndUpdate(userId, updateData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      userData: {
        name: updatedUser.name,
        email: updatedUser.email,
        isAccountVerified: updatedUser.isAccountVerified,
        profileImage: updatedUser.profileImage,
        phoneNumber: updatedUser.phoneNumber,
        bio: updatedUser.bio,
        address: updatedUser.address,
        websiteLinks: updatedUser.websiteLinks,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};