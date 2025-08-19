import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getUserData, updateProfile } from "../../services/api"; // Adjust path if needed
import styles from "../pagesmodulecss/profile.module.css";

interface UserProfile {
  name: string;
  email: string;
  profileImage: string;
  phoneNumber: string;
  bio: string;
  address: string;
  websiteLinks: string[];
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    phoneNumber: "",
    bio: "",
    address: "",
    websiteLinks: [""],
    profileImage: null as File | null,
  });
  const [previewImage, setPreviewImage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getUserData();
        const data = response.data.userData;
        setUser(data);
        setFormData({
          phoneNumber: data.phoneNumber || "",
          bio: data.bio || "",
          address: data.address || "",
          websiteLinks: data.websiteLinks?.length ? data.websiteLinks : [""],
          profileImage: null,
        });
        setPreviewImage(data.profileImage || "");
      } catch (err) {
        setError("Failed to load profile data.");
      }
    };
    fetchUser();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...formData.websiteLinks];
    newLinks[index] = value;
    setFormData((prev) => ({ ...prev, websiteLinks: newLinks }));
  };

  const addLink = () => {
    setFormData((prev) => ({
      ...prev,
      websiteLinks: [...prev.websiteLinks, ""],
    }));
  };

  const removeLink = (index: number) => {
    const newLinks = formData.websiteLinks.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, websiteLinks: newLinks }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData((prev) => ({ ...prev, profileImage: file }));
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const submitData = new FormData();
    submitData.append("phoneNumber", formData.phoneNumber);
    submitData.append("bio", formData.bio);
    submitData.append("address", formData.address);
    formData.websiteLinks.forEach((link) => {
      if (link.trim()) submitData.append("websiteLinks[]", link.trim());
    });
    if (formData.profileImage) {
      submitData.append("profileImage", formData.profileImage);
    }

    try {
      await updateProfile(submitData);
      setSuccess("Profile updated successfully!");
      const response = await getUserData();
      setUser(response.data.userData);
    } catch (err) {
      setError("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className={styles.loading}>Loading...</div>;

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h1
        className={styles.title}
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Profile Dashboard
      </motion.h1>

      {/* Profile Info */}
      <motion.div
        className={styles.profileInfo}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <img
          src={previewImage || "default-profile.png"}
          alt="Profile"
          className={styles.profileImage}
        />
        <p>
          <strong>Name:</strong> {user.name}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Phone:</strong> {user.phoneNumber || "Not set"}
        </p>
        <p>
          <strong>Bio:</strong> {user.bio || "Not set"}
        </p>
        <p>
          <strong>Address:</strong> {user.address || "Not set"}
        </p>
        <p>
          <strong>Website Links:</strong>
        </p>
        <ul>
          {user.websiteLinks?.map((link, index) => (
            <li key={index}>
              <a href={link} target="_blank" rel="noopener noreferrer">
                {link}
              </a>
            </li>
          )) || <li>None</li>}
        </ul>
      </motion.div>

      {/* Profile Edit Form */}
      <motion.form
        onSubmit={handleSubmit}
        className={styles.form}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <label>Profile Image:</label>
        <input
          type="file"
          accept="image/jpeg, image/png"
          onChange={handleImageChange}
        />

        <label>Phone Number:</label>
        <input
          type="text"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleInputChange}
        />

        <label>Bio:</label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
        />

        <label>Address:</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
        />

        <label>Website Links:</label>
        {formData.websiteLinks.map((link, index) => (
          <div key={index} className={styles.linkInput}>
            <input
              type="url"
              value={link}
              onChange={(e) => handleLinkChange(index, e.target.value)}
            />
            {index > 0 && (
              <button type="button" onClick={() => removeLink(index)}>
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addLink} className={styles.addBtn}>
          Add Link
        </button>

        <motion.button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? "Updating..." : "Update Profile"}
        </motion.button>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
      </motion.form>
    </motion.div>
  );
};

export default Profile;
