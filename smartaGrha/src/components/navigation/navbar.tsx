// src/Components/Navigation/Navbar.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const ACCOUNT_ROUTES = ['Settings', 'Profile'];

const drawerVariants: Variants = {
  hidden: { x: '-100%' },
  visible: {
    x: 0,
    transition: { type: 'spring' as const, stiffness: 320, damping: 34, mass: 0.8 },
  },
  exit: { x: '-100%', transition: { duration: 0.28, ease: EASE } },
};

const scrimVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const listStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.1 } },
};

const itemIn: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } },
};

const Navbar: React.FC<NavbarProps> = ({ darkMode, onToggleDarkMode, handleSignOut }) => {
  const [sidebar, setSidebar] = useState(false);
  const toggleSidebar = () => setSidebar(!sidebar);
  const location = useLocation();

  /* Lock scroll when the drawer is open */
  useEffect(() => {
    if (sidebar) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [sidebar]);

  /* Close drawer on Escape */
  useEffect(() => {
    if (!sidebar) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebar(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebar]);

  const mainItems = SidebarData.filter(i => !ACCOUNT_ROUTES.includes(i.title));
  const accountItems = SidebarData.filter(i => ACCOUNT_ROUTES.includes(i.title));

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const currentTitle = SidebarData.find(i => isActive(i.path))?.title ?? 'Home';

  return (
    <IconContext.Provider value={{ color: 'currentColor', size: '1em' }}>
      {/* ---------- Top bar ---------- */}
      <motion.header
        className={`${styles.navbar} ${darkMode ? styles.dark : ''}`}
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className={styles.navbarInner}>
          {/* Brand */}
          <Link to="/" className={styles.brand} aria-label="SmartHome home">
            <span className={styles.brandMarkWrap}>
              <img src={logo} alt="" className={styles.brandMark} />
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>SmartHome</span>
              <span className={styles.brandCrumb}>{currentTitle}</span>
            </span>
          </Link>

          {/* Actions */}
          <div className={styles.actions}>
            <Link to="/Notification" className={styles.iconBtn} aria-label="Notifications">
              <IoIcons.IoMdNotificationsOutline />
              <span className={styles.badge} aria-hidden />
            </Link>

            <button
              type="button"
              onClick={onToggleDarkMode}
              className={styles.iconBtn}
              aria-label="Toggle theme"
            >
              {darkMode ? <FaIcons.FaMoon /> : <FaIcons.FaSun />}
            </button>

            <button
              type="button"
              onClick={toggleSidebar}
              className={styles.menuBtn}
              aria-label="Open navigation"
              aria-expanded={sidebar}
            >
              <FaIcons.FaBars />
            </button>
          </div>
        </div>
      </motion.header>

      {/* ---------- Drawer ---------- */}
      <AnimatePresence>
        {sidebar && (
          <>
            <motion.div
              key="scrim"
              className={styles.scrim}
              variants={scrimVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={toggleSidebar}
            />

            <motion.nav
              key="drawer"
              className={`${styles.drawer} ${darkMode ? styles.dark : ''}`}
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-label="Primary"
            >
              {/* Drawer header */}
              <div className={styles.drawerHead}>
                <span className={styles.drawerTitle}>Menu</span>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className={styles.closeBtn}
                  aria-label="Close navigation"
                >
                  <AiIcons.AiOutlineClose />
                </button>
              </div>

              {/* Scrollable nav body */}
              <motion.ul
                className={styles.drawerList}
                variants={listStagger}
                initial="hidden"
                animate="visible"
              >
                <li className={styles.sectionLabel}>Dashboards</li>
                {mainItems.map((item) => (
                  <motion.li
                    key={item.title}
                    className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ''}`}
                    variants={itemIn}
                  >
                    <Link to={item.path} onClick={toggleSidebar}>
                      <span className={styles.navIcon}>{item.icon}</span>
                      <span className={styles.navLabel}>{item.title}</span>
                      <span className={styles.navArrow} aria-hidden>→</span>
                    </Link>
                  </motion.li>
                ))}

                <li className={styles.sectionLabel}>Account</li>
                {accountItems.map((item) => (
                  <motion.li
                    key={item.title}
                    className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ''}`}
                    variants={itemIn}
                  >
                    <Link to={item.path} onClick={toggleSidebar}>
                      <span className={styles.navIcon}>{item.icon}</span>
                      <span className={styles.navLabel}>{item.title}</span>
                      <span className={styles.navArrow} aria-hidden>→</span>
                    </Link>
                  </motion.li>
                ))}

                <motion.li
                  className={`${styles.navItem} ${isActive('/Notification') ? styles.navItemActive : ''}`}
                  variants={itemIn}
                >
                  <Link to="/Notification" onClick={toggleSidebar}>
                    <span className={styles.navIcon}>
                      <IoIcons.IoMdNotificationsOutline />
                    </span>
                    <span className={styles.navLabel}>Notifications</span>
                    <span className={styles.navArrow} aria-hidden>→</span>
                  </Link>
                </motion.li>
              </motion.ul>

              {/* Drawer footer */}
              <motion.div
                className={styles.drawerFoot}
                variants={itemIn}
                initial="hidden"
                animate="visible"
              >
                <button
                  type="button"
                  onClick={() => { handleSignOut(); toggleSidebar(); }}
                  className={styles.signOut}
                >
                  <AiIcons.AiOutlineLogout />
                  <span>Sign out</span>
                </button>
              </motion.div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </IconContext.Provider>
  );
};

export default Navbar;
