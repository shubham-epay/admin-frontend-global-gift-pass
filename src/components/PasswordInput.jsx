import { useState } from 'react';
import Icon from './Icon';

/** Password box with a show / hide toggle. Accepts the same props as <input>. */
export default function PasswordInput({ className = 'input', ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input {...props} className={className} type={visible ? 'text' : 'password'} spellCheck={false} autoCapitalize="off" />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
        disabled={props.disabled}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  );
}
