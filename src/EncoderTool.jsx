import { useMemo, useState } from 'react';
import { b64utf8 } from './lib/md5.js';

/*
 * Encoder playground. Paste an XSS payload (or a break-out string) and see every
 * encoding that smuggles it past a filter, each paired with the Hackvertor tag
 * that produces the same thing inline in Burp. Runs entirely client-side.
 *
 * The point: a filter/WAF sees the *encoded* bytes, but the browser (HTML
 * parser, URL decoder, JS engine) decodes them back before the sink runs.
 *
 * Host seams (props): openModal({code,label}) shows the "view" popup (button
 * hidden when absent); onBurst() fires on a successful copy.
 */

const PRESETS = [
  { label: 'script tag', value: '<script>alert(1)</script>' },
  { label: 'attribute break-out', value: '"><script>alert(1)</script>' },
  { label: 'JS string break-out', value: "\\'-alert(1)//" },
];

const utf8 = (s) => Array.from(new TextEncoder().encode(s));

const ENCODERS = [
  {
    key: 'url',
    name: 'URL-encode',
    tag: '<@urlencode>',
    fn: (s) => encodeURIComponent(s),
    note: 'Beats a filter matching literal special chars; the server/URL layer decodes it first.',
  },
  {
    key: 'urlall',
    name: 'URL-encode all',
    tag: '<@urlencodeall>',
    fn: (s) => utf8(s).map((b) => '%' + b.toString(16).toUpperCase().padStart(2, '0')).join(''),
    note: 'Every byte as %XX — defeats allow-lists that only decode/inspect known-bad sequences.',
  },
  {
    key: 'url2',
    name: 'Double URL-encode',
    tag: '<@urlencode><@urlencode>…</@urlencode></@urlencode>',
    fn: (s) => encodeURIComponent(encodeURIComponent(s)),
    note: 'Use when a proxy decodes once before the check but the app decodes again after.',
  },
  {
    key: 'dec',
    name: 'HTML decimal entities',
    tag: '<@dec_entities>',
    fn: (s) => [...s].map((c) => '&#' + c.codePointAt(0) + ';').join(''),
    note: 'Reflected in HTML, the parser decodes `&#60;` → `<`, so the literal char never appears in your input.',
  },
  {
    key: 'hex',
    name: 'HTML/XML hex entities',
    tag: '<@hex_entities>',
    fn: (s) => [...s].map((c) => '&#x' + c.codePointAt(0).toString(16) + ';').join(''),
    note: 'Same as decimal but hex — also the XML-parser trick for smuggling SQL past a WAF (stock-check).',
  },
  {
    key: 'b64',
    name: 'Base64',
    tag: '<@base64>',
    fn: (s) => b64utf8(s),
    note: 'Hide the payload in a string, then run it with `eval(atob(\'…\'))`.',
  },
  {
    key: 'unicode',
    name: 'JS unicode escapes',
    tag: '<@unicode>',
    fn: (s) => [...s].map((c) => '\\u' + c.codePointAt(0).toString(16).padStart(4, '0')).join(''),
    note: 'Inside a JS string the engine decodes `\\u003c` → `<`, slipping a quote/bracket past a literal-char filter.',
  },
];

export default function EncoderTool({ openModal, onBurst = () => {} }) {
  const [input, setInput] = useState(PRESETS[0].value);
  const [copied, setCopied] = useState('');

  const rows = useMemo(
    () => ENCODERS.map((e) => ({ ...e, out: input ? e.fn(input) : '—' })),
    [input]
  );

  function copy(key, value) {
    if (!value || value === '—') return;
    const done = () => {
      setCopied(key);
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
      <div className="tool-row">
        <label className="tool-wide">
          payload
          <input
            type="text"
            value={input}
            placeholder="<script>alert(1)</script>"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
      </div>
      <div className="preset-chips">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={'chip' + (input === p.value ? ' active' : '')}
            onClick={() => setInput(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="tool-out">
        {rows.map((r) => (
          <div key={r.key} className="enc-line">
            <div className="enc-head">
              <span className="k">{r.name}</span>
              <code className="inline hv-tag">{r.tag}</code>
            </div>
            <div className="tool-line">
              <code>{r.out}</code>
              {openModal && (
                <button type="button" className="mini-copy" onClick={() => openModal({ code: r.out, label: r.name })}>view</button>
              )}
              <button
                type="button"
                className={'mini-copy' + (copied === r.key ? ' copied' : '')}
                onClick={() => copy(r.key, r.out)}
              >
                {copied === r.key ? 'copied ✓' : 'copy'}
              </button>
            </div>
            <p className="hint">{r.note}</p>
          </div>
        ))}
      </div>
      <p className="hint">
        Runs entirely in your browser — nothing is sent anywhere. The left chip is the Burp{' '}
        <strong>Hackvertor</strong> tag that produces the same output inline (tag names vary by version).
      </p>
    </div>
  );
}
