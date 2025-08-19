// src/Components/pages/StripLed.tsx
import React, { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { motion, AnimatePresence } from "framer-motion";
import { getLedSettings, updateLedSettings } from "../../services/api";
import styles from "../pagesmodulecss/stripLed.module.css";

interface LedStripProps {
  darkMode: boolean;
}

interface Microcontroller {
  name: string;
  ipAddress: string;
  number: string;
}

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
    name: "",
    ipAddress: "",
    number: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const effectModes = [
    "Solid", "Rainbow", "Aurora", "Blends", "Blink", "Blink Rainbow",
    "Bpm", "Breathe", "Candle", "Chase", "Chase Flash"
  ];

  const sendSettings = async () => {
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
    <div className={darkMode ? styles.darkContainer : styles.lightContainer}>
      <motion.div
        className={styles.container}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className={styles.title}>LED Strip Dashboard</h1>

        {/* Power Toggle */}
<motion.div className={styles.powerSwitch} whileTap={{ scale: 0.95 }}>
  <label className={styles.switchLabel}>Power:</label>
  <motion.div
    className={`${styles.toggleSwitch} ${power ? styles.on : styles.off}`}
    onClick={() => setPower(!power)}
    layout
    transition={{ type: "spring", stiffness: 500, damping: 30 }}
  >
    <motion.div
      className={styles.toggleHandle}
      layout
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  </motion.div>
</motion.div>


        {/* LED Preview */}
        <motion.div
          className={styles.ledPreview}
          style={{ backgroundColor: power && effectMode !== "Rainbow" ? color : "#000" }}
          animate={
            power && effectMode === "Rainbow"
              ? {
                  background: [
                    "#ff0000",
                    "#ff7f00",
                    "#ffff00",
                    "#00ff00",
                    "#0000ff",
                    "#4b0082",
                    "#8f00ff",
                  ],
                }
              : {}
          }
          transition={
            effectMode === "Rainbow"
              ? { repeat: Infinity, duration: 6, ease: "linear" }
              : {}
          }
        >
          {/* Circular Glow */}
          <motion.div
            className={styles.circleGlow}
            animate={{
              scale: power ? [1, 1.05, 1] : 1,
              opacity: power ? [0.7, 1, 0.7] : 0,
            }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </motion.div>

        {/* Control Panel */}
        <AnimatePresence>
          {power && (
            <motion.div
              className={styles.controlPanel}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <section>
                <h2>🎨 Color Control</h2>
                <HexColorPicker color={color} onChange={setColor} className={styles.colorPicker} />
              </section>

              <section>
                <h2>💡 Brightness</h2>
                <input type="range" min="0" max="100" value={brightness} onChange={(e) => setBrightness(+e.target.value)} />
              </section>

              <section>
                <h2>⚡ Effect Speed</h2>
                <input type="range" min="0" max="100" value={effectSpeed} onChange={(e) => setEffectSpeed(+e.target.value)} />
              </section>

              <section>
                <h2>🔥 Effect Intensity</h2>
                <input type="range" min="0" max="100" value={effectIntensity} onChange={(e) => setEffectIntensity(+e.target.value)} />
              </section>

              <section>
                <h2>🎆 Effect Mode</h2>
                <select value={effectMode} onChange={(e) => setEffectMode(e.target.value)}>
                  {effectModes.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </section>

              <section>
                <h2>🎶 Sync with Music</h2>
                <input type="checkbox" checked={syncMusic} onChange={() => setSyncMusic(!syncMusic)} />
              </section>

              <section>
                <h2>🔗 Microcontrollers</h2>
                <select value={selectedMicrocontroller} onChange={(e) => setSelectedMicrocontroller(e.target.value)}>
                  {microcontrollers.map((mc) => (
                    <option key={mc.number} value={mc.number}>{mc.name}</option>
                  ))}
                </select>
                <button onClick={() => setShowAddForm(true)}>+ Add</button>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add New Microcontroller Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              className={styles.addForm}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h2>Add New Microcontroller</h2>
              <input type="text" name="name" value={newMicrocontroller.name} onChange={handleInputChange} placeholder="Name" />
              <input type="text" name="ipAddress" value={newMicrocontroller.ipAddress} onChange={handleInputChange} placeholder="IP Address" />
              <input type="text" name="number" value={newMicrocontroller.number} onChange={handleInputChange} placeholder="Number" />
              <div className={styles.formActions}>
                <button onClick={handleAddMicrocontroller}>Save</button>
                <button onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default StripLed;
