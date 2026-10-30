import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CharCodeTool, Md5CookieTool, EncoderTool, CsrfPoc } from '../src/index.js';
import '../styles.css';
import './demo.css';

/* Demo host: provides a real openModal (a simple overlay) so the widgets'
   "view" buttons work, and shows each widget in its own section. onBurst is
   left to its no-op default. CsrfPoc uses the package's bundled CodeBlock. */
function App() {
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);

  const sections = [
    {
      id: 'charcode',
      title: 'String.fromCharCode helper',
      blurb: 'Rebuild an XSS payload so characters a filter strips are reconstructed at runtime.',
      el: <CharCodeTool openModal={setModal} />,
    },
    {
      id: 'charcode-adv',
      title: 'String.fromCharCode — advanced (period-free)',
      blurb: 'Same idea, but it brackets the method call too, so the output contains no periods at all.',
      el: <CharCodeTool advanced openModal={setModal} />,
    },
    {
      id: 'md5',
      title: 'Stay-logged-in cookie forger',
      blurb: 'Builds base64(username + ":" + md5(password)) for cookie-forging attacks.',
      el: <Md5CookieTool openModal={setModal} />,
    },
    {
      id: 'encoder',
      title: 'Encoder playground',
      blurb: 'Every encoding that smuggles a payload past a filter, each with its Hackvertor equivalent.',
      el: <EncoderTool openModal={setModal} />,
    },
    {
      id: 'csrf',
      title: 'CSRF PoC builder',
      blurb: 'Auto-submitting exploit page with toggles for the token field, referrer, pushState, and cookie-set.',
      el: <CsrfPoc openModal={setModal} />,
    },
  ];

  return (
    <div className="wrap">
      <header className="page-head">
        <div className="kicker">@ohhaiohhai/burp-widgets</div>
        <h1>Interactive security widgets</h1>
        <p className="goal">
          Standalone React widgets for Burp Suite / BSCP workflows, extracted from the BSCP notes
          site. Everything runs entirely in your browser — nothing is sent anywhere.
        </p>
      </header>

      {sections.map((s) => (
        <section key={s.id} className="section">
          <h2>{s.title} <span className="tag">widget</span></h2>
          <p className="hint">{s.blurb}</p>
          {s.el}
        </section>
      ))}

      <footer>@ohhaiohhai/burp-widgets · live demo</footer>

      {modal && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>{modal.label}</span>
              <div className="modal-actions">
                <button type="button" className="copy-btn" onClick={close}>close</button>
              </div>
            </div>
            <div className="modal-body">
              <div className="code"><pre className="code-wrap"><code>{modal.code}</code></pre></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
);
