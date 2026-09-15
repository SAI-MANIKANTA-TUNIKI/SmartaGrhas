// src/Components/pages/StripLed.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
} from 'framer-motion';
import { getLedSettings, updateLedSettings } from '../../services/api';
import styles from '../pagesmodulecss/stripLed.module.css';

/* --------------------------------------------------------------
   Types
   -------------------------------------------------------------- */
interface LedStripProps {
  darkMode: boolean;
}

interface Microcontroller {
  name: string;
  ipAddress: string;
  number: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/* --------------------------------------------------------------
   Constants
   -------------------------------------------------------------- */
const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

const EFFECT_MODES = [
  'Solid',
  'Rainbow',
  'Aurora',
  'Blends',
  'Blink',
  'Blink Rainbow',
  'Bpm',
  'Breathe',
  'Candle',
  'Chase',
  'Chase Flash',
] as const;

/* Warm-paper friendly presets — no neon */
const PRESETS = [
  { hex: '#FFFFFF', name: 'Paper' },
  { hex: '#FFF1D6', name: 'Warm' },
  { hex: '#FFD166', name: 'Amber' },
  { hex: '#FF7F50', name: 'Coral' },
  { hex: '#C96442', name: 'Terracotta' },
  { hex: '#E84A5F', name: 'Rose' },
  { hex: '#8C6A8E', name: 'Plum' },
  { hex: '#5B7A94', name: 'Steel' },
  { hex: '#6B8E78', name: 'Sage' },
  { hex: '#7A8A5C', name: 'Olive' },
];

/* --------------------------------------------------------------
   Animated count — for the numeric readouts
   -------------------------------------------------------------- */
const AnimatedNumber: React.FC<{ value: number; suffix?: string }> = ({
  value,
  suffix = '',
}) => {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 260, damping: 28 });
  const text = useTransform(spring, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.35, ease: EASE_OUT });
    return () => controls.stop();
  }, [value, mv]);

  return <motion.span>{text}</motion.span>;
};

/* --------------------------------------------------------------
   Save indicator
   -------------------------------------------------------------- */
const SaveIndicator: React.FC<{ state: SaveState }> = ({ state }) => {
  const label =
    state === 'saving'
      ? 'Saving'
      : state === 'saved'
      ? 'Saved'
      : state === 'error'
      ? 'Error'
      : 'Synced';

  return (
    <div className={styles.saveIndicator} data-state={state} aria-live="polite">
      <span className={styles.saveDot} />
      <span className={styles.saveLabel}>{label}</span>
    </div>
  );
};

/* ==============================================================
   Page
   ============================================================== */
const StripLed: React.FC<LedStripProps> = ({ darkMode }) => {
  const [color, setColor] = useState('#FF0000');
  const [hexInput, setHexInput] = useState('#FF0000');
  const [brightness, setBrightness] = useState(100);
  const [effectSpeed, setEffectSpeed] = useState(50);
  const [effectIntensity, setEffectIntensity] = useState(50);
  const [power, setPower] = useState(true);
  const [effectMode, setEffectMode] = useState<string>('Solid');
  const [syncMusic, setSyncMusic] = useState(false);

  const [microcontrollers, setMicrocontrollers] = useState<Microcontroller[]>([
    {
      name: 'microcontroller01',
      ipAddress: '192.168.1.100',
      number: 'microcontroller01',
    },
  ]);
  const [selectedMicrocontroller, setSelectedMicrocontroller] =
    useState('microcontroller01');

  const [newMc, setNewMc] = useState<Microcontroller>({
    name: '',
    ipAddress: '',
    number: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const currentMc = useMemo(
    () => microcontrollers.find((m) => m.number === selectedMicrocontroller),
    [microcontrollers, selectedMicrocontroller]
  );

  /* ---- Fetch settings on controller change ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getLedSettings(selectedMicrocontroller);
        if (cancelled) return;
        setColor(s.color);
        setHexInput(s.color.toUpperCase());
        setBrightness(s.brightness);
        setEffectSpeed(s.effectSpeed);
        setEffectIntensity(s.effectIntensity);
        setPower(s.power);
        setEffectMode(s.effectMode);
        setSyncMusic(s.syncMusic);
      } catch (err) {
        if (!cancelled) console.error('Error fetching LED settings:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedMicrocontroller]);

  /* ---- Keep hex input synced with color ---- */
  useEffect(() => {
    setHexInput(color.toUpperCase());
  }, [color]);

  /* ---- Debounced save (400ms) ---- */
  const saveTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!power) return;
    window.clearTimeout(saveTimer.current);

    saveTimer.current = window.setTimeout(async () => {
      setSaveState('saving');
      try {
        await updateLedSettings(selectedMicrocontroller, {
          color,
          brightness,
          effectSpeed,
          effectIntensity,
          power,
          effectMode,
          syncMusic,
        });
        setSaveState('saved');
        window.setTimeout(() => setSaveState('idle'), 1400);
      } catch (err) {
        console.error('Error saving LED settings:', err);
        setSaveState('error');
      }
    }, 400);

    return () => window.clearTimeout(saveTimer.current);
  }, [
    color,
    brightness,
    effectSpeed,
    effectIntensity,
    effectMode,
    syncMusic,
    selectedMicrocontroller,
    power,
  ]);

  /* ---- Handlers ---- */
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setHexInput(v);
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) setColor(v.toUpperCase());
  };

  const handleAddMicrocontroller = () => {
    if (!newMc.name || !newMc.ipAddress || !newMc.number) return;
    setMicrocontrollers((prev) => [...prev, newMc]);
    setSelectedMicrocontroller(newMc.number);
    setNewMc({ name: '', ipAddress: '', number: '' });
    setShowAddForm(false);
  };

  /* ---- LED animation keyed by effect mode ---- */
  const ledAnimation = useMemo(() => {
    if (!power) return {};

    if (effectMode === 'Rainbow' || effectMode === 'Blink Rainbow') {
      return {
        backgroundImage: [
          'linear-gradient(90deg,#ff0000,#ff7f00,#ffff00,#00ff00,#0000ff,#4b0082,#8f00ff)',
          'linear-gradient(90deg,#8f00ff,#ff0000,#ff7f00,#ffff00,#00ff00,#0000ff,#4b0082)',
          'linear-gradient(90deg,#4b0082,#8f00ff,#ff0000,#ff7f00,#ffff00,#00ff00,#0000ff)',
          'linear-gradient(90deg,#0000ff,#4b0082,#8f00ff,#ff0000,#ff7f00,#ffff00,#00ff00)',
          'linear-gradient(90deg,#00ff00,#0000ff,#4b0082,#8f00ff,#ff0000,#ff7f00,#ffff00)',
          'linear-gradient(90deg,#ffff00,#00ff00,#0000ff,#4b0082,#8f00ff,#ff0000,#ff7f00)',
          'linear-gradient(90deg,#ff7f00,#ffff00,#00ff00,#0000ff,#4b0082,#8f00ff,#ff0000)',
        ],
      };
    }

    if (effectMode === 'Breathe' || effectMode === 'Candle') {
      return { opacity: [1, 0.55, 1] };
    }

    if (effectMode === 'Blink' || effectMode === 'Chase Flash') {
      return { opacity: [1, 1, 0.15, 0.15] };
    }

    return {};
  }, [effectMode, power]);

  const ledTransition = useMemo(() => {
    if (effectMode === 'Rainbow') {
      return { repeat: Infinity, duration: 6, ease: 'linear' as const };
    }
    if (effectMode === 'Blink Rainbow') {
      return { repeat: Infinity, duration: 3, ease: 'linear' as const };
    }
    if (effectMode === 'Breathe' || effectMode === 'Candle') {
      return { repeat: Infinity, duration: 4, ease: 'easeInOut' as const };
    }
    if (effectMode === 'Blink' || effectMode === 'Chase Flash') {
      return { repeat: Infinity, duration: 1.6, ease: 'linear' as const };
    }
    return { duration: 0.4 };
  }, [effectMode]);

  /* Numeric brightness we hand to the glow intensity via CSS var */
  const glowScale = Math.max(0.15, brightness / 100);

  return (
    <div className={darkMode ? styles.darkContainer : styles.lightContainer}>
      <div className={styles.container}>
        {/* ---------------- Header ---------------- */}
        <motion.header
          className={styles.header}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          style={{ ['--led-color' as any]: color }}
        >
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>LED Strip</h1>
            <p className={styles.subtitle}>
              {currentMc?.name ?? 'controller'} · {currentMc?.ipAddress ?? '—'}
            </p>
          </div>

          <div className={styles.headerRight}>
            <SaveIndicator state={saveState} />

            <div className={styles.powerSwitch}>
              <span className={styles.switchLabel}>{power ? 'On' : 'Off'}</span>
              <motion.button
                type="button"
                aria-pressed={power}
                aria-label="Toggle strip power"
                className={`${styles.toggleSwitch} ${
                  power ? styles.on : styles.off
                }`}
                onClick={() => setPower((v) => !v)}
                whileTap={{ scale: 0.96 }}
              >
                <motion.span
                  layout
                  className={styles.toggleHandle}
                  transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                />
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* ---------------- Layout ---------------- */}
        <div className={styles.layout}>
          {/* -------- Stage -------- */}
          <div className={styles.stageColumn}>
            <div
              className={`${styles.ledStage} ${power ? styles.on : styles.off}`}
              style={
                {
                  ['--led-color' as any]: color,
                  ['--led-soft' as any]: `color-mix(in srgb, ${color} ${
                    18 + glowScale * 22
                  }%, transparent)`,
                } as React.CSSProperties
              }
            >
              <motion.div
                className={styles.ledStrip}
                animate={ledAnimation}
                transition={ledTransition}
                style={{ opacity: power ? 1 : 0.08 }}
              />

              <motion.div
                className={styles.ledGlow}
                animate={{ opacity: power ? [0.55, 0.85, 0.55] : 0 }}
                transition={{
                  repeat: Infinity,
                  duration: 3.6,
                  ease: 'easeInOut',
                }}
                style={{ opacity: glowScale }}
              />

              <div className={styles.stageMeta}>
                <div className={styles.stageMetaItem}>
                  <span className={styles.stageMetaLabel}>HEX</span>
                  <span className={styles.stageMetaValue}>
                    {color.toUpperCase()}
                  </span>
                </div>
                <div className={styles.stageMetaItem}>
                  <span className={styles.stageMetaLabel}>MODE</span>
                  <span className={styles.stageMetaValue}>{effectMode}</span>
                </div>
                <div className={styles.stageMetaItem}>
                  <span className={styles.stageMetaLabel}>BRIGHTNESS</span>
                  <span className={styles.stageMetaValue}>{brightness}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* -------- Controls -------- */}
          <AnimatePresence mode="wait" initial={false}>
            {power ? (
              <motion.div
                key="controls"
                className={styles.controlsColumn}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                {/* Color */}
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Color</span>
                    <input
                      className={styles.hexInput}
                      value={hexInput}
                      onChange={handleHexChange}
                      spellCheck={false}
                      maxLength={7}
                      aria-label="Hex color"
                    />
                  </div>

                  <div
                    className={styles.pickerWrap}
                    style={{ ['--led-color' as any]: color } as React.CSSProperties}
                  >
                    <HexColorPicker color={color} onChange={setColor} />
                  </div>

                  <div className={styles.presets}>
                    {PRESETS.map((p) => {
                      const active =
                        p.hex.toLowerCase() === color.toLowerCase();
                      return (
                        <button
                          key={p.hex}
                          type="button"
                          title={p.name}
                          aria-label={p.name}
                          className={`${styles.swatch} ${
                            active ? styles.swatchActive : ''
                          }`}
                          onClick={() => setColor(p.hex)}
                          style={{ background: p.hex }}
                        >
                          {active && (
                            <motion.span
                              layoutId="presetRing"
                              className={styles.swatchRing}
                              transition={{
                                type: 'spring',
                                stiffness: 420,
                                damping: 32,
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Brightness */}
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Brightness</span>
                    <span className={styles.sectionValue}>
                      <AnimatedNumber value={brightness} suffix="%" />
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={brightness}
                    onChange={(e) => setBrightness(+e.target.value)}
                    className={styles.slider}
                    aria-label="Brightness"
                    style={
                      {
                        ['--led-color' as any]: color,
                        ['--fill' as any]: `${brightness}%`,
                      } as React.CSSProperties
                    }
                  />
                </section>

                {/* Speed + Intensity */}
                <div className={styles.twoUp}>
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionLabel}>Speed</span>
                      <span className={styles.sectionValue}>
                        <AnimatedNumber value={effectSpeed} suffix="%" />
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={effectSpeed}
                      onChange={(e) => setEffectSpeed(+e.target.value)}
                      className={styles.slider}
                      aria-label="Effect speed"
                      style={
                        {
                          ['--led-color' as any]: color,
                          ['--fill' as any]: `${effectSpeed}%`,
                        } as React.CSSProperties
                      }
                    />
                  </section>

                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionLabel}>Intensity</span>
                      <span className={styles.sectionValue}>
                        <AnimatedNumber value={effectIntensity} suffix="%" />
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={effectIntensity}
                      onChange={(e) => setEffectIntensity(+e.target.value)}
                      className={styles.slider}
                      aria-label="Effect intensity"
                      style={
                        {
                          ['--led-color' as any]: color,
                          ['--fill' as any]: `${effectIntensity}%`,
                        } as React.CSSProperties
                      }
                    />
                  </section>
                </div>

                {/* Effect mode */}
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Effect</span>
                    <span className={styles.sectionValue}>{effectMode}</span>
                  </div>
                  <div className={styles.modeGrid}>
                    {EFFECT_MODES.map((mode) => {
                      const active = effectMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          className={`${styles.modeChip} ${
                            active ? styles.modeChipActive : ''
                          }`}
                          onClick={() => setEffectMode(mode)}
                          aria-pressed={active}
                        >
                          {active && (
                            <motion.span
                              layoutId="modeChipPill"
                              className={styles.modeChipPill}
                              transition={{
                                type: 'spring',
                                stiffness: 420,
                                damping: 34,
                              }}
                            />
                          )}
                          <span className={styles.modeChipLabel}>{mode}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="off"
                className={styles.controlsOff}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <p className={styles.offTitle}>Strip is off</p>
                <p className={styles.offCopy}>
                  Turn the strip back on to adjust color, brightness, and
                  effects.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ---------------- Footer ---------------- */}
        <motion.div
          className={styles.footer}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE_OUT }}
        >
          {/* Music sync */}
          <section className={styles.footerCard}>
            <div className={styles.footerHeader}>
              <span className={styles.footerLabel}>Music sync</span>
              <button
                type="button"
                role="switch"
                aria-checked={syncMusic}
                aria-label="Toggle music sync"
                className={`${styles.miniSwitch} ${
                  syncMusic ? styles.on : styles.off
                }`}
                onClick={() => setSyncMusic((v) => !v)}
              >
                <motion.span
                  layout
                  className={styles.miniHandle}
                  transition={{
                    type: 'spring',
                    stiffness: 520,
                    damping: 30,
                  }}
                />
              </button>
            </div>
            <p className={styles.footerCopy}>
              Pulse the strip to the beat. Audio is detected on the connected
              controller — nothing leaves your network.
            </p>
          </section>

          {/* Controller */}
          <section className={styles.footerCard}>
            <div className={styles.footerHeader}>
              <span className={styles.footerLabel}>Controller</span>
              <select
                value={selectedMicrocontroller}
                onChange={(e) => setSelectedMicrocontroller(e.target.value)}
                className={styles.select}
                aria-label="Select controller"
              >
                {microcontrollers.map((mc) => (
                  <option key={mc.number} value={mc.number}>
                    {mc.name} · {mc.ipAddress}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence initial={false} mode="wait">
              {showAddForm ? (
                <motion.div
                  key="form"
                  className={styles.addForm}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                  style={{ overflow: 'hidden' }}
                >
                  <input
                    className={styles.textInput}
                    placeholder="Name"
                    value={newMc.name}
                    onChange={(e) =>
                      setNewMc({ ...newMc, name: e.target.value })
                    }
                  />
                  <input
                    className={styles.textInput}
                    placeholder="IP address"
                    value={newMc.ipAddress}
                    onChange={(e) =>
                      setNewMc({ ...newMc, ipAddress: e.target.value })
                    }
                  />
                  <input
                    className={styles.textInput}
                    placeholder="Identifier"
                    value={newMc.number}
                    onChange={(e) =>
                      setNewMc({ ...newMc, number: e.target.value })
                    }
                  />
                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={handleAddMicrocontroller}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="addBtn"
                  type="button"
                  className={styles.addDeviceBtn}
                  onClick={() => setShowAddForm(true)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  + Add controller
                </motion.button>
              )}
            </AnimatePresence>
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default StripLed;
