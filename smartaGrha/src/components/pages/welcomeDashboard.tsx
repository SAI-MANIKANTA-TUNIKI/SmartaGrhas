import React from 'react';
import { motion, easeInOut } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import styles from '../pagesmodulecss/welcomeDashboard.module.css';


interface WelcomeDashboardProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const fadeFloatVariants = {
  hidden: { opacity: 0, y: 40 },
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
  visible: { transition: { staggerChildren: 0.25 } },
};

// Smart home device icons from Iconify
const deviceIcons = [
  'mdi:lightbulb', // Light bulb
  'mdi:fan', // Fan
  'mdi:television', // TV
  'mdi:air-conditioner', // Air Conditioner
  'mdi:fridge', // Refrigerator
  'mdi:air-humidifier', // Cooler
  'mdi:monitor', // Monitor
  'mdi:router-wireless', // WiFi Router
  'mdi:speaker', // Speaker
  'mdi:home-theater', // Home Theatre
  'mdi:sparkle', // Sparkle for smoke effect
];

const WelcomeDashboard: React.FC<WelcomeDashboardProps> = ({ darkMode, onToggleDarkMode }) => {
  const navigate = useNavigate();
  const handleGetStarted = () => navigate('/auth');

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      {/* Background Animated Icons */}
      <div className={styles.backgroundIcons}>
        {Array.from({ length: 15 }).map((_, index) => {
          const icon = deviceIcons[Math.floor(Math.random() * deviceIcons.length)];
          return (
            <motion.div
              key={index}
              className={styles.iconItem}
              style={{
                top: `${Math.random() * 90}%`,
                left: `${Math.random() * 90}%`,
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
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
              whileHover={{
                scale: 1.2,
                rotate: 0,
                opacity: 0.8,
                transition: { duration: 0.3 },
              }}
            >
              <img
                src={`https://api.iconify.design/${icon}.svg?color=${darkMode ? '%23ffffff' : '%23888888'}`}
                alt={icon}
                className={styles.deviceIcon}
              />
              {icon === 'mdi:sparkle' && (
                <div className={styles.smokeEffect}></div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Hero Section */}
      <motion.div
        className={styles.hero}
        initial="hidden"
        animate="visible"
        variants={fadeFloatVariants}
      >
        <div className={styles.heroText}>
          <motion.h1 variants={fadeFloatVariants}>
            Welcome to Your Smart Home Assistant
          </motion.h1>
          <motion.p variants={fadeFloatVariants} className={styles.subtitle}>
            Control your home effortlessly, with elegance and ease.
          </motion.p>
          <motion.button
            onClick={handleGetStarted}
            className={styles.getStartedButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Get Started
          </motion.button>
          <motion.button
            onClick={onToggleDarkMode}
            className={styles.toggleDarkModeButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </motion.button>
        </div>
      </motion.div>

      {/* Why Choose Section */}
      <motion.div
        className={styles.whyChoose}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <h2>Why Choose Our Platform?</h2>
        <p className={styles.subtitle}>
          Elegant, intuitive, and eco-conscious—just like a butterfly’s flight.
        </p>
        <div className={styles.benefits}>
          {[
            { icon: '🔒', title: 'Advanced Security', desc: 'Keep your home cocoon-safe.' },
            { icon: '🌱', title: 'Energy Efficient', desc: 'Save energy, live gently.' },
            { icon: '📱', title: 'Easy Control', desc: 'All your devices in one place.' },
          ].map((item, i) => (
            <motion.div
              key={i}
              className={styles.benefitCard}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.3, duration: 0.8, ease: easeInOut }}
            >
              <span className={styles.icon}>{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className={styles.benefits}>
          {[
            { icon: 'mdi:lock', title: 'Advanced Security', desc: 'Keep your home cocoon-safe with top-tier protection.' },
            { icon: 'mdi:leaf', title: 'Energy Efficient', desc: 'Save energy with smart, sustainable routines.' },
            { icon: 'mdi:cellphone', title: 'Easy Control', desc: 'Manage all your devices from one intuitive platform.' },
          ].map((item, i) => (
            <motion.div
              key={i}
              className={styles.benefitCard}
              variants={fadeFloatVariants}
              whileHover={{ scale: 1.05, boxShadow: darkMode ? '0 0 15px rgba(255, 255, 255, 0.3)' : '0 0 15px rgba(0, 0, 0, 0.2)' }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <img
                src={`https://api.iconify.design/${item.icon}.svg?color=${darkMode ? '%23ffffff' : '%23000000'}`}
                alt={item.title}
                className={styles.benefitIcon}
              />
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Call to Action Section */}
      <motion.div
        className={styles.callToAction}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeFloatVariants}
      >
        <h2>Ready to Transform Your Home?</h2>
        <p className={styles.subtitle}>
          Glide into smarter living with effortless control.
        </p>

        <motion.button
          onClick={handleGetStarted}
          className={styles.getStartedButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Get Started Today!
        </motion.button>
      </motion.div>
    </div>
  );
};

export default WelcomeDashboard;