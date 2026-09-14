import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

/**
 * Eine An/Aus-Einstellung als Zeile mit Schalter (Entwurf B1 „Optionen").
 * Darunter eine echte Checkbox, als Schalter angesagt.
 */
export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, icon, disabled = false }) => (
  <label className={['toggle-row', checked && 'is-on', disabled && 'is-disabled'].filter(Boolean).join(' ')}>
    {icon && <span className="toggle-icon" aria-hidden="true">{icon}</span>}
    <span className="toggle-label">{label}</span>
    <input
      type="checkbox"
      role="switch"
      className="toggle-input"
      checked={checked}
      disabled={disabled}
      onChange={e => onChange(e.target.checked)}
    />
    <span className="toggle-track" aria-hidden="true">
      <span className="toggle-thumb" />
    </span>
  </label>
);
