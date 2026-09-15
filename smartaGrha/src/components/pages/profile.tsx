// src/Components/Pages/profile.tsx
import React, { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { getUserData, updateProfile } from "../../services/api";
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

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

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

  if (!user) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <p>Loading profile…</p>
      </div>
    );
  }

  const initials = user.name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={styles.container}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>Account · Profile</p>
          <h1 className={styles.title}>Your profile</h1>
        </div>
      </header>

      <motion.div
        className={styles.layout}
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* ---------- Left: identity card ---------- */}
        <motion.aside className={styles.identity} variants={fadeUp}>
          <div className={styles.avatarWrap}>
            {previewImage ? (
              <img src={previewImage} alt="" className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>{initials || "?"}</div>
            )}
            <label className={styles.avatarEdit} aria-label="Change profile image">
              <input
                type="file"
                accept="image/jpeg, image/png"
                onChange={handleImageChange}
                className={styles.avatarInput}
              />
              <img
                src="https://api.iconify.design/mdi:camera-outline.svg?color=%23f0ede7"
                alt="" width={16} height={16}
              />
            </label>
          </div>

          <h2 className={styles.name}>{user.name}</h2>
          <p className={styles.email}>{user.email}</p>

          <dl className={styles.meta}>
            <div className={styles.metaRow}>
              <dt>Phone</dt>
              <dd>{user.phoneNumber || <span className={styles.unset}>Not set</span>}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>Address</dt>
              <dd>{user.address || <span className={styles.unset}>Not set</span>}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>Bio</dt>
              <dd>{user.bio || <span className={styles.unset}>Not set</span>}</dd>
            </div>
          </dl>

          {user.websiteLinks?.length > 0 && (
            <div className={styles.links}>
              <span className={styles.linksLabel}>Links</span>
              <ul>
                {user.websiteLinks.map((link, i) => (
                  <li key={i}>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      <span className={styles.linkIcon}>
                        <img
                          src="https://api.iconify.design/mdi:link-variant.svg?color=%238a8681"
                          alt="" width={12} height={12}
                        />
                      </span>
                      <span className={styles.linkText}>{link}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.aside>

        {/* ---------- Right: edit form ---------- */}
        <motion.section className={styles.formCard} variants={fadeUp}>
          <header className={styles.formHead}>
            <h2>Edit details</h2>
            <p>Only the fields you change will be updated.</p>
          </header>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="phoneNumber">Phone number</label>
              <input
                id="phoneNumber"
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+1 (555) 000-0000"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="address">Address</label>
              <input
                id="address"
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Street, city, country"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="A short line about you"
                className={styles.textarea}
                rows={3}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.fieldHead}>
                <label className={styles.fieldLabel}>Website links</label>
                <button
                  type="button"
                  onClick={addLink}
                  className={styles.addLinkBtn}
                >
                  + Add
                </button>
              </div>

              <div className={styles.linksList}>
                {formData.websiteLinks.map((link, index) => (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className={styles.linkRow}
                  >
                    <span className={styles.linkRowIndex}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                      placeholder="https://"
                      className={styles.input}
                    />
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeLink(index)}
                        className={styles.removeBtn}
                        aria-label="Remove link"
                      >
                        <img
                          src="https://api.iconify.design/mdi:close.svg?color=%238a8681"
                          alt="" width={12} height={12}
                        />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            <div className={styles.formFoot}>
              <div className={styles.statusSlot}>
                {error && (
                  <motion.p
                    className={styles.error}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className={styles.statusDot} data-kind="error" />
                    {error}
                  </motion.p>
                )}
                {success && (
                  <motion.p
                    className={styles.success}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className={styles.statusDot} data-kind="ok" />
                    {success}
                  </motion.p>
                )}
              </div>

              <motion.button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <>
                    <span className={styles.btnSpinner} />
                    Updating…
                  </>
                ) : (
                  "Save changes"
                )}
              </motion.button>
            </div>
          </form>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default Profile;
