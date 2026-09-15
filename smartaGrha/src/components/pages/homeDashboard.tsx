// smartaGrha/src/components/pages/homeDashboard.tsx
import React, { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionTemplate,
  type Variants,
} from 'framer-motion';
import styles from '../pagesmodulecss/homeDashboard.module.css';

interface HomeDashboardProps {
  darkMode: boolean;
}

/* --------------------------------------------------------------
   Easing + variant primitives
   -------------------------------------------------------------- */
const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

/* --------------------------------------------------------------
   TiltCard — 3D tilt + cursor spotlight, reusable
   -------------------------------------------------------------- */
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: string;
  variants?: Variants;
}

const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className,
  glow = 'rgba(201, 100, 66, 0.14)',
  variants,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const nx = useMotionValue(0); // -0.5 → 0.5
  const ny = useMotionValue(0);

  const rotateX = useSpring(useTransform(ny, [-0.5, 0.5], [7, -7]), {
    stiffness: 220,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(nx, [-0.5, 0.5], [-7, 7]), {
    stiffness: 220,
    damping: 24,
  });

  const spotlight = useMotionTemplate`radial-gradient(340px circle at ${mx}px ${my}px, ${glow}, transparent 72%)`;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
    nx.set((e.clientX - r.left) / r.width - 0.5);
    ny.set((e.clientY - r.top) / r.height - 0.5);
  };

  const onLeave = () => {
    nx.set(0);
    ny.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variants}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      <motion.span className={styles.spotlight} style={{ background: spotlight }} />
      {children}
    </motion.div>
  );
};

/* --------------------------------------------------------------
   Data
   -------------------------------------------------------------- */
const FLOATING = [
  'mdi:lightbulb-outline',
  'mdi:fan',
  'mdi:television-classic',
  'mdi:air-conditioner',
  'mdi:fridge-outline',
  'mdi:router-wireless',
  'mdi:speaker-wireless',
  'mdi:home-thermometer-outline',
];

const FEATURES = [
  {
    icon: 'mdi:gesture-tap',
    title: 'Effortless control',
    desc: 'Every device on one considered surface.',
  },
  {
    icon: 'mdi:leaf-circle-outline',
    title: 'Quietly efficient',
    desc: 'Routines that trim your footprint.',
  },
  {
    icon: 'mdi:weather-sunset',
    title: 'Ambient intelligence',
    desc: 'Light and climate that read the room.',
  },
  {
    icon: 'mdi:chart-timeline-variant',
    title: 'Clear insights',
    desc: 'Understand your home at a glance.',
  },
];

const BENEFITS = [
  {
    icon: 'mdi:meditation',
    title: 'Calm by design',
    desc: 'Interfaces that never demand attention.',
  },
  {
    icon: 'mdi:shield-lock-outline',
    title: 'Private by default',
    desc: 'Your data stays on your devices.',
  },
  {
    icon: 'mdi:palette-swatch-outline',
    title: 'Adaptive moods',
    desc: 'Lighting tuned to the moment.',
  },
];

const HERO_WORDS = ['Welcome', 'to', 'SmartHome'];

/* --------------------------------------------------------------
   Component
   -------------------------------------------------------------- */
const HomeDashboard: React.FC<HomeDashboardProps> = ({ darkMode }) => {
  const heroRef = useRef<HTMLElement>(null);

  /* Scroll-linked parallax for the hero block */
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const iconColor = darkMode ? '%23f0ede7' : '%23171614';

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      {/* ---------- Ambient floating device icons ---------- */}
      <div className={styles.backgroundIcons} aria-hidden="true">
        {FLOATING.map((icon, i) => (
          <motion.div
            key={icon}
            className={styles.iconItem}
            style={{
              top: `${(i * 37) % 84 + 6}%`,
              left: `${(i * 53) % 84 + 6}%`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.22, 0.1], y: [0, -10, 0] }}
            transition={{
              duration: 9 + i * 0.7,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.35,
            }}
          >
            <img
              src={`https://api.iconify.design/${icon}.svg?color=${iconColor}`}
              alt=""
              className={styles.deviceIcon}
            />
          </motion.div>
        ))}
      </div>

      {/* ---------- Hero ---------- */}
      <motion.section
        ref={heroRef}
        className={styles.hero}
        style={{ y: heroY, opacity: heroOpacity }}
      >
        <motion.p
          className={styles.eyebrow}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <span className={styles.dot} />
          SAI HOME AUTOMATION
        </motion.p>

        <h1 className={styles.heroTitle}>
          {HERO_WORDS.map((word, i) => (
            <span key={word} className={styles.wordWrap}>
              <motion.span
                className={styles.word}
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{
                  duration: 0.95,
                  ease: EASE,
                  delay: 0.15 + i * 0.09,
                }}
              >
                {word === 'SmartHome' ? (
                  <em className={styles.accent}>{word}</em>
                ) : (
                  word
                )}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
        >
          A quieter way to run your home — every device on one considered surface,
          nothing you don&rsquo;t need.
        </motion.p>
      </motion.section>

      {/* ---------- Features ---------- */}
      <motion.section
        className={styles.features}
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        {FEATURES.map((f) => (
          <TiltCard key={f.title} className={styles.featureCard} variants={fadeUp}>
            <span className={styles.iconWrap}>
              <img
                src={`https://api.iconify.design/${f.icon}.svg?color=${iconColor}`}
                alt=""
              />
            </span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </TiltCard>
        ))}
      </motion.section>

      {/* ---------- Why Choose ---------- */}
      <section className={styles.whyChoose}>
        <motion.header
          className={styles.sectionHeader}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.85, ease: EASE }}
        >
          <p className={styles.eyebrow}>
            <span className={styles.dot} />
            Why SmartHome
          </p>
          <h2>Designed for the way you actually live.</h2>
          <p className={styles.subtitle}>
            Fewer taps. Less noise. A home that feels like it&rsquo;s on your side.
          </p>
        </motion.header>

        <motion.div
          className={styles.benefits}
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {BENEFITS.map((b) => (
            <TiltCard
              key={b.title}
              className={styles.benefitItem}
              variants={fadeUp}
              glow="rgba(107, 142, 120, 0.16)"
            >
              <span className={styles.iconWrap}>
                <img
                  src={`https://api.iconify.design/${b.icon}.svg?color=${iconColor}`}
                  alt=""
                />
              </span>
              <h3>{b.title}</h3>
              <p>{b.desc}</p>
            </TiltCard>
          ))}
        </motion.div>
      </section>
    </div>
  );
};

export default HomeDashboard;
