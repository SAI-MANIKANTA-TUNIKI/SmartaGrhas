import React from 'react';
import { motion } from 'framer-motion';
import styles from '../pagesmodulecss/homeDashboard.module.css';


interface HomeDashboardProps {
  darkMode: boolean;
}

const fadeFloat = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: [0.42, 0, 0.58, 1] as [number, number, number, number] }
  }
};



const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.25 } }
};

// Smart home device icons from Iconify (public CDN)
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
  'mdi:sparkle' // Sparkle effect for visual flair
];

const HomeDashboard: React.FC<HomeDashboardProps> = ({ darkMode }) => {
  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      {/* Background Animated Icons */}
      <div className={styles.backgroundIcons}>
        {deviceIcons.map((icon, index) => (
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
        ))}
      </div>

      {/* Hero Section */}
      <motion.div
        className={styles.hero}
        initial="hidden"
        animate="visible"
        variants={fadeFloat}
      >
        <motion.div className={styles.heroText} variants={fadeFloat}>
          <h1 className={styles.heroTitle}>Welcome to SmartHome</h1>
          <p className={styles.subtitle}>
            Control your world with ease — seamless, smart, and elegant.
          </p>
        </motion.div>


      </motion.div>

      {/* Features */}
      <motion.div
        className={styles.features}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {[
          { icon: 'mdi:remote', title: 'Elegant Control', desc: 'Manage devices with a single touch.' },
          { icon: 'mdi:leaf', title: 'Eco Friendly', desc: 'Smart routines to save energy.' },
          { icon: 'mdi:lightbulb-outline', title: 'Ambient Automation', desc: 'Your home adapts to your needs.' },
          { icon: 'mdi:chart-line', title: 'Smart Insights', desc: 'Visualize usage with intuitive charts.' }
        ].map((feature, index) => (
          <motion.div
            key={index}
            className={styles.featureCard}
            variants={fadeFloat}
            whileHover={{ scale: 1.05, boxShadow: darkMode ? '0 0 15px rgba(255, 255, 255, 0.3)' : '0 0 15px rgba(0, 0, 0, 0.2)' }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <img
              src={`https://api.iconify.design/${feature.icon}.svg?color=${darkMode ? '%23ffffff' : '%23000000'}`}
              alt={feature.title}
              className={styles.featureIcon}
            />
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Why Choose */}
      <motion.div
        className={styles.whyChoose}
        initial="hidden"
        animate="visible"
        variants={fadeFloat}
      >
        <h2>Why Choose SmartHome?</h2>
        <p className={styles.subtitle}>Intuitive, secure, and eco-conscious living</p>

        <motion.div className={styles.benefits} variants={staggerContainer}>
          {[
            { icon: 'mdi:flower', title: 'Peaceful Environment', desc: 'Smooth transitions & ambient moods.' },
            { icon: 'mdi:lock', title: 'Secure', desc: 'Your data is protected like a vault.' },
            { icon: 'mdi:palette', title: 'Color Adaptive', desc: 'Lighting that matches your mood.' }
          ].map((benefit, index) => (
            <motion.div
              key={index}
              className={styles.benefitItem}
              variants={fadeFloat}
              whileHover={{ scale: 1.05, boxShadow: darkMode ? '0 0 15px rgba(255, 255, 255, 0.3)' : '0 0 15px rgba(0, 0, 0, 0.2)' }}
              transition={{ type: 'spring', stiffness: 180 }}
            >
              <img
                src={`https://api.iconify.design/${benefit.icon}.svg?color=${darkMode ? '%23ffffff' : '%23000000'}`}
                alt={benefit.title}
                className={styles.benefitIcon}
              />
              <h3>{benefit.title}</h3>
              <p>{benefit.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default HomeDashboard;