// src/Components/pages/welcomeDashboard.tsx
import React from 'react';
import { motion, easeInOut } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import styles from '../pagesmodulecss/welcomeDashboard.module.css';

interface WelcomeDashboardProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, ease: easeInOut } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

const features = [
  {
    icon: 'mdi:shield-lock-outline',
    title: 'Private by default',
    desc: 'Every device talks only to your home network — no cloud required.',
  },
  {
    icon: 'mdi:leaf-circle-outline',
    title: 'Quietly efficient',
    desc: 'Routines that lower your footprint without asking you to think about it.',
  },
  {
    icon: 'mdi:gesture-tap-button',
    title: 'One surface',
    desc: 'Lights, climate, cameras, power — a single, considered place to run it all.',
  },
];

const WelcomeDashboard: React.FC<WelcomeDashboardProps> = ({ darkMode, onToggleDarkMode }) => {
  const navigate = useNavigate();
  const handleGetStarted = () => navigate('/auth');

  const iconColor = darkMode ? '%23f0ede7' : '%23171614';

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      {/* ---------- Top bar ---------- */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden />
          <span className={styles.brandName}>SmartHome</span>
          <span className={styles.brandVer}>v2</span>
        </div>

        <motion.button
          type="button"
          className={styles.themeToggle}
          onClick={onToggleDarkMode}
          whileTap={{ scale: 0.94 }}
          aria-label="Toggle theme"
        >
          <span className={styles.themeDot} data-on={darkMode} />
          <span>{darkMode ? 'Dark' : 'Light'}</span>
        </motion.button>
      </header>

      {/* ---------- Hero ---------- */}
      <motion.section
        className={styles.hero}
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.p className={styles.eyebrow} variants={fadeUp}>
          <span className={styles.pulse} aria-hidden />
          A quieter smart home
        </motion.p>

        <h1 className={styles.title}>
          <span className={styles.lineWrap}>
            <motion.span
              className={styles.line}
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
            >
              Your home,
            </motion.span>
          </span>
          <span className={styles.lineWrap}>
            <motion.span
              className={styles.line}
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            >
              <em>on your terms.</em>
            </motion.span>
          </span>
        </h1>

        <motion.p className={styles.subtitle} variants={fadeUp}>
          One surface for every device, sensor, and routine — designed to
          disappear into the background of your day.
        </motion.p>

        <motion.div className={styles.actions} variants={fadeUp}>
          <motion.button
            className={styles.primary}
            onClick={handleGetStarted}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            Get started
            <span className={styles.arrow} aria-hidden>→</span>
          </motion.button>
          <a className={styles.secondary} href="#why">
            Learn more
          </a>
        </motion.div>
      </motion.section>

      {/* ---------- Feature rail ---------- */}
      <motion.section
        id="why"
        className={styles.rail}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
      >
        {features.map((f) => (
          <motion.div key={f.title} className={styles.railItem} variants={fadeUp}>
            <img
              src={`https://api.iconify.design/${f.icon}.svg?color=${iconColor}`}
              alt=""
              className={styles.railIcon}
            />
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </motion.div>
        ))}
      </motion.section>

      {/* ---------- Footer CTA ---------- */}
      <motion.section
        className={styles.cta}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUp}
      >
        <div className={styles.ctaInner}>
          <div className={styles.ctaCopy}>
            <h2>Ready when you are.</h2>
            <p>Setup takes about two minutes. No account required to look around.</p>
          </div>
          <motion.button
            className={styles.primary}
            onClick={handleGetStarted}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            Open the dashboard
            <span className={styles.arrow} aria-hidden>→</span>
          </motion.button>
        </div>
      </motion.section>
    </div>
  );
};

export default WelcomeDashboard;
