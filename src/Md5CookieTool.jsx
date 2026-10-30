import { useMemo, useState } from 'react';
import { md5, b64utf8 } from './lib/md5.js';

/*
 * Interactive "Stay-Logged-In" cookie builder.
 * cookie = base64(username + ":" + md5(password)). Runs entirely in the browser
 * (nothing is sent anywhere). Values are local component state only.
 *
 * Host seams (props): openModal({code,label}) shows the "view" popup (button
 * hidden when absent); onBurst() fires on a successful copy.
 */
export default function Md5CookieTool({ openModal, onBurst = () => {} }) {
  const [pw, setPw] = useState('');
  const [user, setUser] = useState('carlos');
  const [copied, setCopied] = useState('');

  const { hash, cookie } = useMemo(() => {
    if (!pw) return { hash: '—', cookie: '—' };
    const h = md5(pw);
    return { hash: h, cookie: b64utf8(`${user || ''}:${h}`) };
  }, [pw, user]);

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
        <label>
          password
          <input
            type="text"
            value={pw}
            placeholder="type a password…"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setPw(e.target.value)}
          />
        </label>
        <label>
          username
          <input
            type="text"
            value={user}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setUser(e.target.value)}
          />
        </label>
      </div>
      <div className="tool-out">
        <div className="tool-line">
          <span className="k">md5</span>
          <code>{hash}</code>
          {openModal && (
            <button type="button" className="mini-copy" onClick={() => openModal({ code: hash, label: 'md5' })}>view</button>
          )}
          <button
            type="button"
            className={'mini-copy' + (copied === 'hash' ? ' copied' : '')}
            onClick={() => copy('hash', hash)}
          >
            {copied === 'hash' ? 'copied ✓' : 'copy'}
          </button>
        </div>
        <div className="tool-line">
          <span className="k">cookie</span>
          <code>{cookie}</code>
          {openModal && (
            <button type="button" className="mini-copy" onClick={() => openModal({ code: cookie, label: 'cookie' })}>view</button>
          )}
          <button
            type="button"
            className={'mini-copy' + (copied === 'cookie' ? ' copied' : '')}
            onClick={() => copy('cookie', cookie)}
          >
            {copied === 'cookie' ? 'copied ✓' : 'copy'}
          </button>
        </div>
      </div>
      <p className="hint">
        Runs entirely in your browser — nothing is sent anywhere.{' '}
        <code className="inline">cookie</code> ={' '}
        <code className="inline">base64(username + ":" + md5(password))</code>.
      </p>
    </div>
  );
}
