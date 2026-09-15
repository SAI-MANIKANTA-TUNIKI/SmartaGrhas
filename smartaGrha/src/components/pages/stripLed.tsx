// src/Components/pages/StripLed.tsx
import React, { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { motion, AnimatePresence } from "framer-motion";
import { getLedSettings, updateLedSettings } from "../../services/api";
import styles from "../pagesmodulecss/stripLed.module.css";

interface LedStripProps { darkMode: boolean; }
interface Microcontroller { name: string; ipAddress: string; number: string; }

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const StripLed: React.FC<LedStripProps> = ({ darkMode }) => {
  const [color, setColor] = useState("#ff0000");
  const [brightness, setBrightness] = useState(100);
  const [effectSpeed, setEffectSpeed] = useState(50);
  const [effectIntensity, setEffectIntensity] = useState(50);
  const [power, setPower] = useState(true);
  const [effectMode, setEffectMode] = useState("Solid");
  const [microcontrollers, setMicrocontrollers] = useState<Microcontroller[]>([
    { name: "microcontroller01", ipAddress: "192.168.1.100", number: "microcontroller01" },
  ]);
  const [selectedMicrocontroller, setSelectedMicrocontroller] = useState("microcontroller01");
  const [syncMusic, setSyncMusic] = useState(false);
  const [newMicrocontroller, setNewMicrocontroller] = useState<Microcontroller>({
    name: "", ipAddress: "", number: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const effectModes = [
    "Solid", "Rainbow", "Aurora", "Blends", "Blink", "Blink Rainbow",
    "Bpm", "Breathe", "Candle", "Chase", "Chase Flash",
  ];

  const sendSettings = async () => {
    try {
      await updateLedSettings(selectedMicrocontroller, {
        color, brightness, effectSpeed, effectIntensity, power, effectMode, syncMusic,
      });
    } catch (error) {
      console.error("Error sending settings:", error);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await getLedSettings(selectedMicrocontroller);
        setColor(settings.color);
        setBrightness(settings.brightness);
        setEffectSpeed(settings.effectSpeed);
        setEffectIntensity(settings.effectIntensity);
        setPower(settings.power);
        setEffectMode(settings.effectMode);
        setSyncMusic(settings.syncMusic);
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, [selectedMicrocontroller]);

  useEffect(() => {
    if (power) sendSettings();
  }, [color, brightness, effectSpeed, effectIntensity, power, effectMode, syncMusic, selectedMicrocontroller]);

  const handleAddMicrocontroller = () => {
    if (newMicrocontroller.name && newMicrocontroller.ipAddress && newMicrocontroller.number) {
      setMicrocontrollers([...microcontrollers, newMicrocontroller]);
      setSelectedMicrocontroller(newMicrocontroller.number);
      setNewMicrocontroller({ name: "", ipAddress: "", number: "" });
      setShowAddForm(false);
    } else {
      alert("Please fill all fields for the new microcontroller.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewMicrocontroller({ ...newMicrocontroller, [name]: value });
  };

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>Ambient · LED</p>
          <h1 className={styles.title}>Light Strip</h1>
        </div>

        <div className={styles.mcSelect}>
          <label className={styles.mcLabel}>Controller</label>
          <select
            value={selectedMicrocontroller}
            onChange={(e) => setSelectedMicrocontroller(e.target.value)}
            className={styles.select}
          >
            {microcontrollers.map((mc) => (
              <option key={mc.number} value={mc.number}>{mc.name}</option>
            ))}
          </select>
        </div>
      </header>

      <div className={styles.layout}>
        {/* ---------- Preview panel ---------- */}
        <motion.section
          className={styles.preview}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <motion.div
            className={styles.ledFrame}
            style={{
              backgroundColor: power && effectMode !== "Rainbow" ? color : "#0a0a09",
            }}
            animate={
              power && effectMode === "Rainbow"
                ? {
                    background: [
                      "#ff3b30", "#ff9500", "#ffcc00",
                      "#34c759", "#007aff", "#5856d6", "#ff2d55",
                    ],
                  }
                : {}
            }
            transition={
              effectMode === "Rainbow"
                ? { repeat: Infinity, duration: 6, ease: "linear" }
                : { duration: 0.4 }
            }
          >
            <motion.div
              className={styles.glow}
              animate={{
                opacity: power ? [0.55, 0.85, 0.55] : 0,
                scale: power ? [1, 1.03, 1] : 0.95,
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ background: `radial-gradient(circle, ${color}66, transparent 65%)` }}
            />
          </motion.div>

          {/* Meta under preview */}
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Colour</span>
              <span className={styles.metaValue}>
                <span className={styles.swatch} style={{ background: color }} />
                {color.toUpperCase()}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Effect</span>
              <span className={styles.metaValue}>{effectMode}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Brightness</span>
              <span className={styles.metaValue}>{brightness}%</span>
            </div>
          </div>
        </motion.section>

        {/* ---------- Control column ---------- */}
        <section className={styles.controls}>
          {/* Power row */}
          <div className={styles.controlRow}>
            <div className={styles.controlHead}>
              <span className={styles.controlLabel}>Power</span>
              <span className={styles.controlHint}>{power ? 'On' : 'Off'}</span>
            </div>

            <button
              type="button"
              className={`${styles.switch} ${power ? styles.switchOn : ''}`}
              onClick={() => setPower(!power)}
              aria-pressed={power}
            >
              <motion.span
                className={styles.switchHandle}
                layout
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {power && (
              <motion.div
                key="controls"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                style={{ overflow: 'hidden' }}
              >
                <div className={styles.controlsInner}>
                  {/* Colour */}
                  <div className={styles.controlBlock}>
                    <header className={styles.blockHead}>
                      <span className={styles.blockTitle}>Colour</span>
                      <span className={styles.blockHint}>Pick any tone</span>
                    </header>
                    <div className={styles.pickerWrap}>
                      <HexColorPicker color={color} onChange={setColor} className={styles.picker} />
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className={styles.sliderGrid}>
                    {[
                      { label: 'Brightness',       value: brightness,      set: setBrightness,      hint: '%' },
                      { label: 'Effect Speed',     value: effectSpeed,     set: setEffectSpeed,     hint: '%' },
                      { label: 'Effect Intensity', value: effectIntensity, set: setEffectIntensity, hint: '%' },
                    ].map((s) => (
                      <div key={s.label} className={styles.controlBlock}>
                        <header className={styles.blockHead}>
                          <span className={styles.blockTitle}>{s.label}</span>
                          <span className={styles.blockValue}>
                            {s.value}<span className={styles.blockUnit}>{s.hint}</span>
                          </span>
                        </header>
                        <input
                          type="range" min={0} max={100} value={s.value}
                          onChange={(e) => s.set(+e.target.value)}
                          className={styles.range}
                          style={{ ['--v' as any]: `${s.value}%`, ['--c' as any]: color }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Effect mode */}
                  <div className={styles.controlBlock}>
                    <header className={styles.blockHead}>
                      <span className={styles.blockTitle}>Effect mode</span>
                      <span className={styles.blockHint}>{effectModes.length} presets</span>
                    </header>
                    <div className={styles.modeGrid}>
                      {effectModes.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          className={`${styles.modeChip} ${effectMode === mode ? styles.modeChipActive : ''}`}
                          onClick={() => setEffectMode(mode)}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sync music */}
                  <div className={styles.controlRow}>
                    <div className={styles.controlHead}>
                      <span className={styles.controlLabel}>Sync with music</span>
                      <span className={styles.controlHint}>Beat-reactive lighting</span>
                    </div>
                    <button
                      type="button"
                      className={`${styles.switch} ${syncMusic ? styles.switchOn : ''}`}
                      onClick={() => setSyncMusic(!syncMusic)}
                      aria-pressed={syncMusic}
                    >
                      <motion.span
                        className={styles.switchHandle}
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 32 }}
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add controller */}
          <div className={styles.controlRow}>
            <div className={styles.controlHead}>
              <span className={styles.controlLabel}>Controllers</span>
              <span className={styles.controlHint}>{microcontrollers.length} registered</span>
            </div>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setShowAddForm(true)}
            >
              + Add
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.div
                className={styles.addForm}
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                style={{ overflow: 'hidden' }}
              >
                <div className={styles.addFormInner}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Name</label>
                    <input
                      type="text" name="name"
                      value={newMicrocontroller.name}
                      onChange={handleInputChange}
                      placeholder="Living Room LED"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>IP Address</label>
                    <input
                      type="text" name="ipAddress"
                      value={newMicrocontroller.ipAddress}
                      onChange={handleInputChange}
                      placeholder="192.168.1.x"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>ID</label>
                    <input
                      type="text" name="number"
                      value={newMicrocontroller.number}
                      onChange={handleInputChange}
                      placeholder="mc-02"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formActions}>
                    <button type="button" className={styles.ghostBtn} onClick={() => setShowAddForm(false)}>
                      Cancel
                    </button>
                    <button type="button" className={styles.primaryBtn} onClick={handleAddMicrocontroller}>
                      Save controller
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};

export default StripLed;
