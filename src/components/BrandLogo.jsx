import logo from '../assets/brand/logo.png';
import logoOnDark from '../assets/brand/logo-on-dark.png';
import mark from '../assets/brand/mark.png';

/**
 * Global Gift Pass logo. `surface` says what it sits on:
 *  - 'auto'  light surface in light theme, dark surface in dark theme (the sidebar)
 *  - 'dark'  always a dark surface (login artwork)
 * CSS picks the matching file, so switching theme needs no re-render.
 */
export default function BrandLogo({ surface = 'auto', className = '' }) {
  return (
    <span className={`brand-logo surface-${surface} ${className}`} role="img" aria-label="Global Gift Pass">
      {surface !== 'dark' && <img className="logo-on-light" src={logo} alt="" width="538" height="122" />}
      <img className="logo-on-dark" src={logoOnDark} alt="" width="538" height="122" />
      <img className="logo-mark" src={mark} alt="" width="122" height="122" />
    </span>
  );
}
