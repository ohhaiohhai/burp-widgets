import { useState } from 'react';

/*
 * Self-contained, token-aware code block. Unlike the host app's CodeBlock (which
 * reads a global TokenProvider), this one keeps {{token}} values in local state,
 * so it works with no providers. Any {{name}} in `code` that matches VAR_DEFS —
 * or any name passed in `extraTokens` / `locals` — gets an input above the block
 * whose value is substituted live.
 *
 *   label       — text in the code head
 *   code        — template string with {{token}} placeholders
 *   raw         — show {{braces}} literally, no inputs
 *   extraTokens — token names to always show an input for (even if absent/added later)
 *   locals      — [{ name, label, def }] instance-scoped tokens (not in VAR_DEFS)
 *   openModal   — ({ code, label }) => void; hides the "view" button when absent
 *   onBurst     — () => void; fired on a successful copy
 *   wrap        — wrap long lines instead of scrolling (modal view)
 */
export const VAR_DEFS = {
  target:  { label: 'target host',    def: 'YOUR-LAB-ID.web-security-academy.net' },
  collab:  { label: 'collaborator',   def: 'YOUR-COLLABORATOR-ID.oastify.com' },
  exploit: { label: 'exploit server', def: 'YOUR-EXPLOIT-SERVER-ID.exploit-server.net' },
  oauth:   { label: 'oauth server',   def: 'oauth-YOUR-OAUTH-SERVER-ID.oauth-server.net' },
  csrf:    { label: 'csrf token',     def: 'CSRF-TOKEN' },
  session: { label: 'session',        def: 'SESSION-COOKIE' },
  name:    { label: 'name',           def: 'OHHAI' },
  email:   { label: 'email',          def: 'oh@hai.com' },
};

/* Replace {{token}} with its current value; unknown tokens are left as-is. */
export function renderTokens(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

/* Ordered, de-duplicated list of known token keys used in a template. */
function tokenKeysIn(tpl) {
  const keys = [];
  (tpl.match(/\{\{(\w+)\}\}/g) || []).forEach((t) => {
    const k = t.slice(2, -2);
    if (VAR_DEFS[k] && keys.indexOf(k) === -1) keys.push(k);
  });
  return keys;
}

export default function CodeBlock({
  label, code, raw = false, extraTokens = [], locals = [],
  openModal, onBurst = () => {}, wrap = false,
}) {
  const found = raw ? [] : tokenKeysIn(code);
  const keys = raw ? [] : [...new Set([...found, ...extraTokens.filter((k) => VAR_DEFS[k])])];
  const localKeys = raw ? [] : locals.filter((l) => code.indexOf('{{' + l.name + '}}') !== -1);

  const [vals, setVals] = useState(() => {
    const o = {};
    keys.forEach((k) => { o[k] = VAR_DEFS[k].def; });
    locals.forEach((l) => { o[l.name] = l.def != null ? l.def : ''; });
    return o;
  });
  const [copied, setCopied] = useState(false);

  const valOf = (k) => (vals[k] != null ? vals[k] : (VAR_DEFS[k] ? VAR_DEFS[k].def : ''));
  const setVal = (k, v) => setVals((p) => ({ ...p, [k]: v }));
  const rendered = raw ? code : renderTokens(code, { ...vals });

  function copy() {
    const done = () => {
      setCopied(true);
      onBurst();
      setTimeout(() => setCopied(false), 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(rendered).then(done, done);
    } else {
      const ta = document.createElement('textarea');
      ta.value = rendered;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
      document.body.removeChild(ta);
    }
  }

  return (
    <div className="code">
      {(keys.length > 0 || localKeys.length > 0) && (
        <div className="code-vars">
          {keys.map((k) => (
            <label key={k}>
              <span className="var-label">{VAR_DEFS[k].label}</span>
              <input
                type="text"
                value={valOf(k)}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setVal(k, e.target.value)}
              />
            </label>
          ))}
          {localKeys.map((l) => (
            <label key={l.name}>
              {l.label}
              <input
                type="text"
                value={valOf(l.name)}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setVal(l.name, e.target.value)}
              />
            </label>
          ))}
        </div>
      )}
      <div className="code-head">
        <span>{label}</span>
        <div className="code-actions">
          {openModal && (
            <button
              type="button"
              className="copy-btn"
              onClick={() => openModal({ code: rendered, label })}
            >
              view
            </button>
          )}
          <button
            type="button"
            className={'copy-btn' + (copied ? ' copied' : '')}
            onClick={copy}
          >
            {copied ? 'copied ✓' : 'copy'}
          </button>
        </div>
      </div>
      <pre className={wrap ? 'code-wrap' : undefined}><code>{rendered}</code></pre>
    </div>
  );
}
