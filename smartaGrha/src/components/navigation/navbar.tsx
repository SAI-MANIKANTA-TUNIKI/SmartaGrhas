// src/Components/Navigation/Navbar.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import * as IoIcons from 'react-icons/io';
import { SidebarData } from './sidebar';
import { IconContext } from 'react-icons';
import styles from '../pagesmodulecss/navbar.module.css';
import logo from '../../assets/logo.jpg';
import { motion, AnimatePresence, type Variants } from 'framer-motion';


interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  handleSignOut: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ darkMode, onToggleDarkMode, handleSignOut }) => {
  const [sidebar, setSidebar] = useState(false);
  const toggleSidebar = () => setSidebar(!sidebar);

  // Animation Variants
  const sidebarVariants: Variants = {
  hidden: { x: '-100%', opacity: 0, scale: 0.95 },
  visible: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 70,
      damping: 15,
    }
  },
  exit: { x: '-100%', opacity: 0, scale: 0.95 }
};


  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.07 }
    })
  };

  return (
    <IconContext.Provider value={{ color: darkMode ? '#f9fafb' : '#1f2937' }}>
      {/* Navbar */}
      <motion.header
        className={`${styles.navbar} ${darkMode ? styles.dark : ''}`}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className={styles.logoContainer}>
          <Link to="/" className={styles.logo}>
            <img src={logo} alt="SmartHome Logo" className={styles.logoImg} />
          </Link>
        </div>

        {/* Menu + Icons */}
        <div className={styles.menuAndDarkModeContainer}>
          <button className={styles.menuBars} onClick={toggleSidebar}>
            <FaIcons.FaBars />
          </button>

          <Link to="/Notification" className={styles.notificationIcon}>
            <IoIcons.IoMdNotificationsOutline />
          </Link>

          <div className={styles.darkModeToggle}>
            <button
              className={`${styles.toggleButton} ${darkMode ? styles.darkMode : ''}`}
              onClick={onToggleDarkMode}
            >
              {darkMode ? <FaIcons.FaMoon /> : <FaIcons.FaSun />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebar && (
          <motion.nav
            className={styles.navMenu}
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <ul className={styles.navMenuItems}>
              <li className={styles.navbarToggle}>
                <button className={styles.menuBars} onClick={toggleSidebar}>
                  <AiIcons.AiOutlineClose />
                </button>
              </li>

              {SidebarData.map((item, index) => (
                <motion.li
                  key={index}
                  className={styles.navText}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                >
                  <Link to={item.path} onClick={toggleSidebar}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </motion.li>
              ))}

              <motion.li
                className={styles.navText}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                custom={SidebarData.length}
              >
                <Link to="/Notification" onClick={toggleSidebar}>
                  <IoIcons.IoMdNotificationsOutline />
                  <span>Notifications</span>
                </Link>
              </motion.li>

              <motion.li
                className={styles.navText}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                custom={SidebarData.length + 1}
              >
                <button
                  onClick={() => { handleSignOut(); toggleSidebar(); }}
                  className={styles.signOutButton}
                >
                  <AiIcons.AiOutlineLogout />
                  <span>Sign Out</span>
                </button>
              </motion.li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </IconContext.Provider>
  );
};

export default Navbar;
