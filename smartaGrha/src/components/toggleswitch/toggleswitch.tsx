import React from 'react';
import styles from './toggleswitch.module.css';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, checked, onChange }) => {
  return (
    <div className={styles.container}>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          id={`toggle-${id}`}
          checked={checked}
          onChange={onChange}
          className={styles.input}
        />
        <span className={styles.slider}>
          <span className={styles.labelOn}>On</span>
          <span className={styles.labelOff}>Off</span>
        </span>
      </label>
    </div>
  );
};

export default ToggleSwitch;
