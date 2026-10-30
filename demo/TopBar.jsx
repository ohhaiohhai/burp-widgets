import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useEffects, burstMatrix } from './effects.jsx';

/* Demo header: brand + nav + accent color picker + Matrix toggle + theme toggle.
   Ported from the notes site's TopBar, minus the app-specific token reset. */

const navClass = ({ isActive }) => (isActive ? 'active' : undefined);

const ACCENTS = {
  dark: [
    { name: 'Blue', hex: '#4f7fe8' },
    { name: 'Purple', hex: '#7c6ae6' },
    { name: 'Teal', hex: '#2bb5a0' },
    { name: 'Orange', hex: '#e2711d' },
    { name: 'Pink', hex: '#e5547c' },
    { name: 'Matrix green', hex: '#2eff54' },
  ],
  light: [
    { name: 'Navy', hex: '#2b3a67' },
    { name: 'Dark tan', hex: '#9c6b3f' },
    { name: 'Brown', hex: '#6f4e37' },
    { name: 'Slate gray', hex: '#4a5568' },
    { name: 'Rust', hex: '#a8551f' },
    { name: 'Forest', hex: '#3f6b43' },
  ],
};

function applyAccent(hex) {
  const root = document.documentElement;
  if (hex) {
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-soft', hex + '1a');
  } else {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-soft');
  }
}

function readAccent(theme) {
  try { return localStorage.getItem('burp-widgets-accent-' + theme) || ''; } catch (e) { return ''; }
}

export default function TopBar({ links }) {
  const { matrixOn, toggleMatrix } = useEffects();
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark'
  );
  const [accents, setAccents] = useState(() => ({ dark: readAccent('dark'), light: readAccent('light') }));

  const accent = accents[theme] || '';

  useEffect(() => { applyAccent(accents[theme] || ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setAccent(hex) {
    const next = accent === hex ? '' : hex; // click the active swatch to clear override
    applyAccent(next);
    try {
      if (next) localStorage.setItem('burp-widgets-accent-' + theme, next);
      else localStorage.removeItem('burp-widgets-accent-' + theme);
    } catch (e) { /* noop */ }
    setAccents((prev) => ({ ...prev, [theme]: next }));
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('burp-widgets-theme', next); } catch (e) { /* noop */ }
    setTheme(next);
    applyAccent(accents[next] || '');
  }

  function doToggleMatrix() {
    const wasOff = !matrixOn;
    toggleMatrix();
    if (wasOff) burstMatrix();
  }

  return (
    <header className="topbar">
      <div className="brand">burp<span>-widgets</span></div>
      <nav>
        <NavLink to="/" end className={navClass}>Home</NavLink>
        {links.map((l) => (
          <NavLink key={l.path} to={'/' + l.path} className={navClass}>{l.label}</NavLink>
        ))}
      </nav>
      <div className="accent-swatches" role="group" aria-label="Accent color">
        {ACCENTS[theme].map((a) => (
          <button
            key={a.hex}
            type="button"
            className={'accent-swatch' + (accent === a.hex ? ' active' : '')}
            style={{ backgroundColor: a.hex }}
            title={a.name + ' accent'}
            aria-label={a.name + ' accent'}
            aria-pressed={accent === a.hex}
            onClick={() => setAccent(a.hex)}
          />
        ))}
      </div>
      <button
        type="button"
        className={'icon-btn' + (matrixOn ? ' active' : '')}
        title="Toggle Matrix rain on copy"
        aria-label="Toggle Matrix rain on copy"
        aria-pressed={matrixOn}
        onClick={doToggleMatrix}
      >
        ⇊
      </button>
      <button
        type="button"
        className="icon-btn"
        title="Toggle theme"
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >
        {theme === 'light' ? '☾' : '☀'}
      </button>
    </header>
  );
}
