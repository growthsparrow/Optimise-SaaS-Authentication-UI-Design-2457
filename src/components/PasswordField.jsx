import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiEye, FiEyeOff, FiLock } = FiIcons;

function PasswordField({ id, label, autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <span className="input-wrap">
        <SafeIcon icon={FiLock} className="input-icon" aria-hidden="true" />
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength="8"
          placeholder="At least 8 characters"
          required
        />
        <button
          className="visibility-button"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <SafeIcon icon={visible ? FiEyeOff : FiEye} aria-hidden="true" />
        </button>
      </span>
    </label>
  );
}

export default PasswordField;