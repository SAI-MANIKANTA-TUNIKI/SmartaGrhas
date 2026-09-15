import React from 'react';
import { motion, easeInOut } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import styles from '../pagesmodulecss/welcomeDashboard.module.css';

interface WelcomeDashboardProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const fadeFloatVariants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 1,
      ease: easeInOut,
    },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

// Smart home device icons from Iconify
const deviceIcons = [
  'mdi:lightbulb',
  'mdi:fan',
  'mdi:television',
  'mdi:air-conditioner',
  'mdi:fridge',
  'mdi:air-humidifier',
  'mdi:monitor',
  'mdi:router-wireless',
  'mdi:speaker',
  'mdi:home-theater',
  'mdi:sparkle',
];

const features = [
  {
    icon: 'mdi:shield-lock',
    title: 'Advanced Security',
    desc: 'Keep your home protected with intelligent monitoring and secure automation designed for everyday peace of mind.',
  },
  {
    icon: 'mdi:leaf',
    title: 'Energy Efficient',
    desc: 'Save energy with smart routines that automatically adapt your devices to how you live.',
  },
  {
    icon: 'mdi:cellphone',
    title: 'Easy Control',
    desc: 'Manage your lights, appliances, climate and connected devices from one intuitive platform.',
  },
];

const WelcomeDashboard: React.FC<WelcomeDashboardProps> = ({
  darkMode,
  onToggleDarkMode,
}) => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      {/* ============================================================
          BACKGROUND WATERMARKS
      ============================================================ */}
      <div className={styles.watermarks} aria-hidden="true">
        {Array.from({ length: 15 }).map((_, index) => {
          const icon =
            deviceIcons[Math.floor(Math.random() * deviceIcons.length)];

          return (
            <motion.div
              key={index}
              className={styles.watermark}
              style={{
                top: `${Math.random() * 90}%`,
                left: `${Math.random() * 90}%`,
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.15, 0.35, 0.15],
                y: [0, -15, 0],
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
                delay: Math.random() * 2,
              }}
            >
              <img
                src={`https://api.iconify.design/${icon}.svg?color=${
                  darkMode ? '%23ffffff' : '%23000000'
                }`}
                alt=""
                className={styles.watermarkIcon}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Hero ambient glow */}
      <div className={styles.heroHalo} aria-hidden="true" />

      {/* ============================================================
          NAVIGATION
      ============================================================ */}
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>SH</div>

          <div className={styles.brandDivider} />

          <span className={styles.brandTag}>
            Smart Home Assistant
          </span>
        </div>

        <motion.button
          type="button"
          onClick={onToggleDarkMode}
          className={styles.themeToggle}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          aria-label={
            darkMode
              ? 'Switch to light mode'
              : 'Switch to dark mode'
          }
        >
          <span aria-hidden="true">
            {darkMode ? '☀️' : '🌙'}
          </span>

          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </motion.button>
      </nav>

      {/* ============================================================
          HERO SECTION
      ============================================================ */}
      <motion.section
        className={styles.hero}
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* Hero Text */}
        <div className={styles.heroText}>
          <motion.div
            className={styles.eyebrow}
            variants={fadeFloatVariants}
          >
            <span
              className={styles.eyebrowDot}
              aria-hidden="true"
            />
            Intelligent living, simplified
          </motion.div>

          <motion.h1
            className={styles.heroTitle}
            variants={fadeFloatVariants}
          >
            <span className={styles.heroLine}>
              <span className={styles.wordWrap}>
                <span className={styles.word}>Your</span>
              </span>

              <span className={styles.wordWrap}>
                <span className={styles.word}>home.</span>
              </span>
            </span>

            <span className={styles.heroLine}>
              <span
                className={`${styles.wordWrap} ${styles.accent}`}
              >
                Smarter.
              </span>

              <span className={styles.wordWrap}>
                <span className={styles.word}>Effortless.</span>
              </span>
            </span>
          </motion.h1>

          <motion.p
            className={styles.heroSubtitle}
            variants={fadeFloatVariants}
          >
            Control your connected home effortlessly with one
            intelligent assistant. Bring comfort, security, energy
            efficiency and simplicity together in one place.
          </motion.p>

          <motion.div
            className={styles.heroActions}
            variants={fadeFloatVariants}
          >
            <motion.button
              type="button"
              onClick={handleGetStarted}
              className={styles.btnPrimary}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </motion.button>

            <motion.button
              type="button"
              onClick={onToggleDarkMode}
              className={styles.btnGhost}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span aria-hidden="true">
                {darkMode ? '☀️' : '🌙'}
              </span>

              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </motion.button>
          </motion.div>

          {/* Hero Meta */}
          <motion.div
            className={styles.heroMeta}
            variants={fadeFloatVariants}
          >
            <div className={styles.heroMetaItem}>
              <span className={styles.heroMetaValue}>01</span>
              <span className={styles.heroMetaLabel}>
                One Platform
              </span>
            </div>

            <div className={styles.heroMetaItem}>
              <span className={styles.heroMetaValue}>24/7</span>
              <span className={styles.heroMetaLabel}>
                Smart Control
              </span>
            </div>

            <div className={styles.heroMetaItem}>
              <span className={styles.heroMetaValue}>∞</span>
              <span className={styles.heroMetaLabel}>
                Possibilities
              </span>
            </div>
          </motion.div>
        </div>

        {/* ========================================================
            HERO VISUAL
        ======================================================== */}
        <motion.div
          className={styles.heroVisual}
          variants={fadeFloatVariants}
        >
          <div className={styles.visualRings} aria-hidden="true">
            <div className={styles.visualRing} />
            <div className={styles.visualRing} />
            <div className={styles.visualRing} />
          </div>

          <motion.div
            className={styles.visualCore}
            animate={{
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className={styles.visualCoreInner}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M12 3v2" />
                <path d="M12 19v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M3 12h2" />
                <path d="M19 12h2" />
                <path d="m4.93 19.07 1.41-1.41" />
                <path d="m17.66 6.34 1.41-1.41" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
          </motion.div>

          {/* Floating telemetry chips */}
          <motion.div
            className={`${styles.visualChip} ${styles.visualChipTop}`}
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 3v18" />
              <path d="M5 8h14" />
              <path d="M7 16h10" />
            </svg>
            HOME ONLINE
          </motion.div>

          <motion.div
            className={`${styles.visualChip} ${styles.visualChipRight}`}
            animate={{
              y: [0, 8, 0],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 3v18" />
              <path d="M5 8h14" />
              <path d="M7 16h10" />
            </svg>
            12 DEVICES
          </motion.div>

          <motion.div
            className={`${styles.visualChip} ${styles.visualChipBottom}`}
            animate={{
              y: [0, -7, 0],
            }}
            transition={{
              duration: 4.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 2v20" />
              <path d="M5 7h14" />
              <path d="M5 17h14" />
            </svg>
            SMART MODE
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ============================================================
          WHY CHOOSE SECTION
      ============================================================ */}
      <motion.section
        className={styles.whyChoose}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className={styles.whyHeader}>
          <motion.span
            className={styles.whyLabel}
            variants={fadeFloatVariants}
          >
            Why choose us
          </motion.span>

          <motion.h2
            className={styles.whyTitle}
            variants={fadeFloatVariants}
          >
            A calmer way to manage the place you call home.
          </motion.h2>

          <motion.p
            className={styles.whyCopy}
            variants={fadeFloatVariants}
          >
            Your smart home should feel invisible when everything
            works and effortless when you need control. Our platform
            brings your connected devices together without adding
            complexity to your everyday life.
          </motion.p>
        </div>

        {/* Feature List */}
        <div className={styles.featureList}>
          {features.map((item, index) => (
            <motion.div
              key={item.title}
              className={styles.featureRow}
              variants={fadeFloatVariants}
              whileHover={{ x: 4 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20,
              }}
            >
              <div className={styles.featureIndex}>
                {String(index + 1).padStart(2, '0')}
              </div>

              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  {item.title}
                </h3>

                <p className={styles.featureDesc}>
                  {item.desc}
                </p>
              </div>

              <div className={styles.featureIcon}>
                <img
                  src={`https://api.iconify.design/${item.icon}.svg?color=${
                    darkMode ? '%23ffffff' : '%23000000'
                  }`}
                  alt=""
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ============================================================
          CALL TO ACTION
      ============================================================ */}
      <section className={styles.cta}>
        <motion.div
          className={styles.ctaPanel}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeFloatVariants}
        >
          <span className={styles.ctaEyebrow}>
            Start your smart home journey
          </span>

          <h2 className={styles.ctaTitle}>
            Ready to transform your home into something{' '}
            <span className={styles.ctaAccent}>
              smarter?
            </span>
          </h2>

          <p className={styles.ctaCopy}>
            Glide into smarter living with effortless control,
            thoughtful automation and a home that works around you.
          </p>

          <motion.button
            type="button"
            onClick={handleGetStarted}
            className={styles.ctaButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Get Started Today!
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};

export default WelcomeDashboard;
