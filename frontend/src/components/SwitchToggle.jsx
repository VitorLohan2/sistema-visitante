// components/SwitchToggle.jsx
import './SwitchToggle.css';

export default function SwitchToggle({ isOn, handleToggle }) {
  return (
    <div className={`switch-container ${isOn ? 'on' : 'off'}`} onClick={handleToggle}>
      <div className="switch-toggle" />
    </div>
  );
}
