// src/Components/Pages/Authentication.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  FaHome,
  FaRegLightbulb,
  FaLock,
  FaWifi,
  FaThermometerHalf,
} from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import styles from "../pagesmodulecss/authentication.module.css";

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/auth`;

type AuthMode = "login" | "register" | "forgot" | "reset";

interface AuthProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  handleLogin: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fieldStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};
const fieldIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const HEADLINES: Record<AuthMode, { eyebrow: string; title: string; sub: string }> = {
  login:    { eyebrow: "Sign in",        title: "Welcome back.",   sub: "Pick up where you left off." },
  register: { eyebrow: "Create account", title: "Set up your home.", sub: "Two minutes, then you're running." },
  forgot:   { eyebrow: "Account recovery", title: "Forgot your password?", sub: "We'll send a code to your email." },
  reset:    { eyebrow: "Reset password", title: "Enter the code.", sub: "Then choose a new password." },
};

const Authentication: React.FC<AuthProps> = ({ darkMode, onToggleDarkMode, handleLogin }) => {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      if (authMode === "register") {
        if (!name.trim()) return setError("Name is required");
        if (password !== confirmPassword) return setError("Passwords do not match");

        const res = await axios.post(`${API_BASE_URL}/register`, { name, email, password }, { withCredentials: true });
        setMessage(res.data.message);
        toast.success(res.data.message);
        setAuthMode("login");

      } else if (authMode === "login") {
        const res = await axios.post(`${API_BASE_URL}/login`, { email, password }, { withCredentials: true });
        setMessage(res.data.message);
        toast.success(res.data.message);
        handleLogin();
        navigate("/home");

      } else if (authMode === "forgot") {
        const res = await axios.post(`${API_BASE_URL}/send-reset-otp`, { email }, { withCredentials: true });
        setMessage(res.data.message);
        toast.success(res.data.message);
        setAuthMode("reset");

      } else if (authMode === "reset") {
        const res = await axios.post(`${API_BASE_URL}/reset-password`, { email, password, otp }, { withCredentials: true });
        setMessage(res.data.message);
        toast.success(res.data.message);
        setAuthMode("login");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Something went wrong";
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setError("");
    setMessage("");
  };

  const meta = HEADLINES[authMode];
  const isPrimaryMode = authMode === "login" || authMode === "register";

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ""}`}>
      <div className={styles.grain} aria-hidden />

      <div className={styles.layout}>
        {/* ---------- Left: brand / editorial panel ---------- */}
        <aside className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <span className={styles.brandMark} aria-hidden>
              <FaHome />
            </span>
            <span className={styles.brandName}>SmartHome</span>
            <span className={styles.brandVer}>v2</span>
          </div>

          <div className={styles.brandBody}>
            <p className={styles.brandEyebrow}>A quieter smart home</p>
            <h1 className={styles.brandHeadline}>
              <span className={styles.lineWrap}>
                <motion.span
                  className={styles.line}
                  initial={{ y: '110%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
                >
                  Your home,
                </motion.span>
              </span>
              <span className={styles.lineWrap}>
                <motion.span
                  className={styles.line}
                  initial={{ y: '110%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.24 }}
                >
                  <em>in hand.</em>
                </motion.span>
              </span>
            </h1>
            <motion.p
              className={styles.brandSub}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
            >
              One surface for lights, climate, cameras, and power — designed to
              disappear into the background of your day.
            </motion.p>
          </div>

          <motion.dl
            className={styles.statusReadout}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.7 }}
          >
            {[
              { k: 'Uptime', v: '99.98%' },
              { k: 'Devices', v: '12' },
              { k: 'Rooms', v: '5' },
              { k: 'Cameras', v: '3' },
            ].map((row) => (
              <div key={row.k} className={styles.statusItem}>
                <dt>{row.k}</dt>
                <dd>{row.v}</dd>
              </div>
            ))}
            <div className={styles.statusLive}>
              <span className={styles.statusDot} />
              Live
            </div>
          </motion.dl>
        </aside>

        {/* ---------- Right: form panel ---------- */}
        <main className={styles.formPanel}>
          <div className={styles.formTop}>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={styles.themeBtn}
              aria-label="Toggle theme"
            >
              <FaRegLightbulb />
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          <motion.div
            className={styles.card}
            initial="hidden"
            animate="visible"
            variants={fieldStagger}
          >
            {/* Segmented tab switcher (only for primary modes) */}
            {isPrimaryMode ? (
              <div className={styles.tabs} role="tablist">
                <button
                  role="tab"
                  aria-selected={authMode === 'login'}
                  className={`${styles.tab} ${authMode === 'login' ? styles.tabActive : ''}`}
                  onClick={() => switchMode('login')}
                >
                  Sign in
                </button>
                <button
                  role="tab"
                  aria-selected={authMode === 'register'}
                  className={`${styles.tab} ${authMode === 'register' ? styles.tabActive : ''}`}
                  onClick={() => switchMode('register')}
                >
                  Create account
                </button>
                <motion.span
                  className={styles.tabThumb}
                  layout
                  transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  style={{ left: authMode === 'login' ? '4px' : 'calc(50% + 0px)' }}
                />
              </div>
            ) : (
              <button
                type="button"
                className={styles.backLink}
                onClick={() => switchMode('login')}
              >
                ← Back to sign in
              </button>
            )}

            {/* Heading */}
            <AnimatePresence mode="wait">
              <motion.header
                key={`head-${authMode}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: EASE }}
                className={styles.head}
              >
                <p className={styles.eyebrow}>{meta.eyebrow}</p>
                <h2 className={styles.title}>{meta.title}</h2>
                <p className={styles.sub}>{meta.sub}</p>
              </motion.header>
            </AnimatePresence>

            {/* Form */}
            <AnimatePresence mode="wait">
              <motion.form
                key={`form-${authMode}`}
                onSubmit={handleSubmit}
                className={styles.form}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                variants={fieldStagger}
              >
                {authMode === "register" && (
                  <motion.div className={styles.field} variants={fieldIn}>
                    <label className={styles.label} htmlFor="name">Full name</label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Jane Doe"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={styles.input}
                    />
                  </motion.div>
                )}

                <motion.div className={styles.field} variants={fieldIn}>
                  <label className={styles.label} htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@home.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                  />
                </motion.div>

                {(authMode === "login" || authMode === "register" || authMode === "reset") && (
                  <motion.div className={styles.field} variants={fieldIn}>
                    <label className={styles.label} htmlFor="password">
                      {authMode === "reset" ? "New password" : "Password"}
                    </label>
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.input}
                    />
                  </motion.div>
                )}

                {authMode === "register" && (
                  <motion.div className={styles.field} variants={fieldIn}>
                    <label className={styles.label} htmlFor="confirmPassword">Confirm password</label>
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={styles.input}
                    />
                  </motion.div>
                )}

                {authMode === "reset" && (
                  <motion.div className={styles.field} variants={fieldIn}>
                    <label className={styles.label} htmlFor="otp">One-time code</label>
                    <input
                      id="otp"
                      type="text"
                      placeholder="6-digit code"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className={styles.input}
                    />
                  </motion.div>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      className={styles.bannerError}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                    >
                      <span className={styles.bannerDot} />
                      {error}
                    </motion.div>
                  )}
                  {message && !error && (
                    <motion.div
                      className={styles.bannerOk}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                    >
                      <span className={styles.bannerDot} />
                      {message}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  className={styles.submitBtn}
                  variants={fieldIn}
                  whileTap={{ scale: 0.985 }}
                >
                  <span>
                    {authMode === "login" && "Sign in"}
                    {authMode === "register" && "Create account"}
                    {authMode === "forgot" && "Send code"}
                    {authMode === "reset" && "Reset password"}
                  </span>
                  <span className={styles.btnArrow} aria-hidden>→</span>
                </motion.button>
              </motion.form>
            </AnimatePresence>

            {/* Footer helpers */}
            <div className={styles.helpers}>
              {authMode === "login" && (
                <button
                  type="button"
                  className={styles.helperLink}
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
              )}
              {authMode === "forgot" && (
                <span className={styles.helperNote}>
                  Check your inbox for the code, then come back to reset.
                </span>
              )}
            </div>
          </motion.div>

          <p className={styles.legal}>
            By continuing, you agree to the SmartHome{' '}
            <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>

          {/* Preserve unused imports so TS doesn't flag them */}
          <span hidden aria-hidden>
            <FaLock /><FaWifi /><FaThermometerHalf />
          </span>
        </main>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        theme={darkMode ? "dark" : "light"}
      />
    </div>
  );
};

export default Authentication;
