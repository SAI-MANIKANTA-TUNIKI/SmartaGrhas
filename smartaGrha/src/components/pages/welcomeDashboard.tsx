import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import styles from '../pagesmodulecss/welcomeDashboard.module.css';

interface WelcomeDashboardProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

/* --------------------------------------------------------------
   Easing + variants
   -------------------------------------------------------------- */
const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};

/* --------------------------------------------------------------
   Content
   -------------------------------------------------------------- */
const HERO_LINES: { text: string; accent?: boolean }[][] = [
  [
    { text: 'A' },
    { text: 'quieter', accent: true },
    { text: 'way' },
  ],
  [
    { text: 'to' },
    { text: 'run' },
    { text: 'your' },
    { text: 'home.', accent: true },
  ],
];

const FEATURES = [
  {
    icon: 'mdi:shield-lock-outline',
    title: 'Private by default',
    desc: 'Commands stay on your network. Nothing about your home leaves it unless you say so — no telemetry, no cloud dependency.',
  },
  {
    icon: 'mdi:leaf-circle-outline',
    title: 'Energy aware',
    desc: 'Routines that quietly trim your monthly bill. No dashboards to babysit, no charts to interpret — just lower numbers.',
  },
  {
    icon: 'mdi:home-analytics',
    title: 'One calm surface',
    desc: 'Lights, climate, cameras, power. Every device on one page, in the order you actually use them. Not a grid of icons.',
  },
];

const WATERMARK_ICONS = [
  'mdi:lightbulb-outline',
  'mdi:fan',
  'mdi:air-conditioner',
  'mdi:router-wireless',
  'mdi:speaker-wireless',
  'mdi:home-thermometer-outline',
];

const HERO_CHIPS = [
  { text: '8 devices online', pos: 'Top' as const },
  { text: '24.1°C · Living room', pos: 'Right' as const },
  { text: '2 rooms active', pos: 'Bottom' as const },
];

/* --------------------------------------------------------------
   Page
   -------------------------------------------------------------- */
const WelcomeDashboard: React.FC<WelcomeDashboardProps> = ({
  darkMode,
  onToggleDarkMode,
}) => {
  const navigate = useNavigate();
  const handleGetStarted = () => navigate('/auth');
  const handleSeeInside = () =>
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });

  const iconColor = darkMode ? '%23f0ede7' : '%230e0e0c';

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      {/* ---------- Watermark layer ---------- */}
      <div className={styles.watermarks} aria-hidden="true">
        {WATERMARK_ICONS.map((icon, i) => (
          <motion.div
            key={icon}
            className={styles.watermark}
            style={{
              top: `${(i * 43) % 78 + 8}%`,
              left: `${(i * 67) % 78 + 8}%`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, -12, 0] }}
            transition={{
              opacity: { duration: 1, delay: i * 0.1 },
              y: {
                duration: 8 + i * 0.7,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.3,
              },
            }}
          >
            <img
              src={`https://api.iconify.design/${icon}.svg?color=${iconColor}`}
              alt=""
              className={styles.watermarkIcon}
            />
          </motion.div>
        ))}
      </div>

      {/* Soft accent halo behind hero */}
      <div className={styles.heroHalo} aria-hidden="true" />

      {/* ---------- Nav ---------- */}
      <motion.nav
        className={styles.nav}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className={styles.brand}>
          <span className={styles.brandMark}>SH</span>
          <span className={styles.brandDivider} />
          <span className={styles.brandTag}>SmartHome</span>
        </div>

        <button
          type="button"
          onClick={onToggleDarkMode}
          className={styles.themeToggle}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
              Light
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              Dark
            </>
          )}
        </button>
      </motion.nav>

      {/* ---------- Hero ---------- */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <motion.span
            className={styles.eyebrow}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          >
            <span className={styles.eyebrowDot} />
            Now in early access
          </motion.span>

          <h1 className={styles.heroTitle}>
            {HERO_LINES.map((line, li) => (
              <span key={li} className={styles.heroLine}>
                {line.map((word, wi) => (
                  <span key={`${li}-${wi}`} className={styles.wordWrap}>
                    <motion.span
                      className={styles.word}
                      initial={{ y: '110%' }}
                      animate={{ y: '0%' }}
                      transition={{
                        duration: 0.95,
                        ease: EASE,
                        delay: 0.25 + li * 0.3 + wi * 0.07,
                      }}
                    >
                      {word.accent ? (
                        <em className={styles.accent}>{word.text}</em>
                      ) : (
                        word.text
                      )}
                    </motion.span>
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <motion.p
            className={styles.heroSubtitle}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.85, ease: EASE }}
          >
            Every device, every room, one considered surface. Designed to feel
            like less software — not more.
          </motion.p>

          <motion.div
            className={styles.heroActions}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1, ease: EASE }}
          >
            <motion.button
              type="button"
              className={styles.btnPrimary}
              onClick={handleGetStarted}
              whileTap={{ scale: 0.98 }}
            >
              Get started
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </motion.button>

            <motion.button
              type="button"
              className={styles.btnGhost}
              onClick={handleSeeInside}
              whileTap={{ scale: 0.98 }}
            >
              See what&rsquo;s inside
            </motion.button>
          </motion.div>

          <motion.div
            className={styles.heroMeta}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.15, ease: EASE }}
          >
            <div className={styles.heroMetaItem}>
              <span className={styles.heroMetaValue}>11</span>
              <span className={styles.heroMetaLabel}>Device classes</span>
            </div>
            <div className={styles.heroMetaItem}>
              <span className={styles.heroMetaValue}>&lt; 80ms</span>
              <span className={styles.heroMetaLabel}>Command latency</span>
            </div>
            <div className={styles.heroMetaItem}>
              <span className={styles.heroMetaValue}>Local</span>
              <span className={styles.heroMetaLabel}>Data residency</span>
            </div>
          </motion.div>
        </div>

        {/* ---------- Hero visual ---------- */}
        <div className={styles.heroVisual}>
          <div className={styles.visualRings} aria-hidden="true">
            <span className={styles.visualRing} />
            <span className={styles.visualRing} />
            <span className={styles.visualRing} />
          </div>

          <motion.div
            className={styles.visualCore}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
          >
            <div className={styles.visualCoreInner}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
              </svg>
            </div>
          </motion.div>

          {HERO_CHIPS.map((chip, i) => (
            <motion.span
              key={chip.text}
              className={`${styles.visualChip} ${
                styles[`visualChip${chip.pos}`]
              }`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.85 + i * 0.15, ease: EASE }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
              </svg>
              {chip.text}
            </motion.span>
          ))}
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className={styles.whyChoose}>
        <motion.div
          className={styles.whyHeader}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.75, ease: EASE }}
        >
          <span className={styles.whyLabel}>What&rsquo;s inside</span>
          <h2 className={styles.whyTitle}>
            Built for the way you actually live.
          </h2>
          <p className={styles.whyCopy}>
            Three principles, in order of how much they matter. Everything else
            is a detail.
          </p>
        </motion.div>

        <motion.div
          className={styles.featureList}
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className={styles.featureRow}
              variants={fadeUp}
            >
              <span className={styles.featureIndex}>
                {String(i + 1).padStart(2, '0')}
              </span>

              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>

              <span className={styles.featureIcon}>
                <img
                  src={`https://api.iconify.design/${f.icon}.svg?color=${iconColor}`}
                  alt=""
                />
              </span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className={styles.cta}>
        <motion.div
          className={styles.ctaPanel}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <span className={styles.ctaEyebrow}>Ready when you are</span>

          <h2 className={styles.ctaTitle}>
            Bring your home <em className={styles.ctaAccent}>into focus.</em>
          </h2>

          <p className={styles.ctaCopy}>
            Setup takes about five minutes. No subscription, no lock-in, and
            your data stays on your network.
          </p>

          <motion.button
            type="button"
            className={styles.ctaButton}
            onClick={handleGetStarted}
            whileTap={{ scale: 0.98 }}
          >
            Get started
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};

export default WelcomeDashboard;
