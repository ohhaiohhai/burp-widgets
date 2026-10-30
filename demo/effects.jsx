import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/* Visual-effects preferences for the demo. Just the Matrix-rain toggle.
   Persisted to localStorage, default OFF (opt-in). Ported from the notes site. */
const KEY = 'burp-widgets-matrix';
const EffectsCtx = createContext(null);

// Module-level mirror of the toggle so burstMatrix() can gate synchronously.
let matrixEnabled = false;
try { matrixEnabled = localStorage.getItem(KEY) === '1'; } catch (e) { /* noop */ }

export function EffectsProvider({ children }) {
  const [matrixOn, setMatrixOn] = useState(matrixEnabled);

  const toggleMatrix = useCallback(() => {
    const next = !matrixEnabled;
    matrixEnabled = next;
    try { localStorage.setItem(KEY, next ? '1' : '0'); } catch (e) { /* noop */ }
    setMatrixOn(next);
  }, []);

  const value = useMemo(() => ({ matrixOn, toggleMatrix }), [matrixOn, toggleMatrix]);
  return <EffectsCtx.Provider value={value}>{children}</EffectsCtx.Provider>;
}

export function useEffects() {
  const ctx = useContext(EffectsCtx);
  if (!ctx) throw new Error('useEffects must be used within an EffectsProvider');
  return ctx;
}

/* Fire a burst of Matrix rain. No-op when toggled off — gated here so callers
   (the widgets' onBurst) don't need the context. */
export function burstMatrix(opts) {
  if (!matrixEnabled) return;
  const detail = {
    scale: opts && typeof opts.scale === 'number' ? opts.scale : 1,
    ms: opts && typeof opts.ms === 'number' ? opts.ms : 0,
  };
  try { window.dispatchEvent(new CustomEvent('matrix-burst', { detail })); } catch (e) { /* noop */ }
}
