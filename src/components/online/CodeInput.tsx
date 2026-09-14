import React, { useState } from 'react';

export const ROOM_CODE_LENGTH = 4;

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * Der Raumcode als vier Kästchen (Entwurf F1).
 *
 * Darunter liegt ein einziges Textfeld über die ganze Breite, nicht vier: so
 * funktionieren Einfügen, Löschen und die Autokorrektur-Leiste am iPhone wie in
 * jedem anderen Feld, und die Kästchen zeigen nur, was darin steht.
 */
export const CodeInput: React.FC<CodeInputProps> = ({ value, onChange, onSubmit, invalid = false, disabled = false }) => {
  const [focused, setFocused] = useState(false);
  const cursor = focused ? Math.min(value.length, ROOM_CODE_LENGTH - 1) : -1;

  return (
    <div className={['code-input', invalid && 'is-invalid', disabled && 'is-disabled'].filter(Boolean).join(' ')}>
      <input
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Raumcode"
        aria-invalid={invalid}
        maxLength={ROOM_CODE_LENGTH}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH))}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="code-input-field"
      />
      {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => (
        <span key={i} className={`code-box ${i === cursor ? 'is-cursor' : ''}`} aria-hidden="true">
          {value[i] ?? ''}
        </span>
      ))}
    </div>
  );
};
