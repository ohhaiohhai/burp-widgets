import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  HashRouter, Routes, Route, Navigate, NavLink, Outlet, useOutletContext,
} from 'react-router-dom';
import { CharCodeTool, Md5CookieTool, EncoderTool, CsrfPoc } from '../src/index.js';
import { EffectsProvider, burstMatrix } from './effects.jsx';
import MatrixRain from './MatrixRain.jsx';
import TopBar from './TopBar.jsx';
import '../styles.css';
import './demo.css';

/* One entry per widget page. `render(openModal, burst)` builds the widget with
   the demo's host seams wired in. */
const WIDGETS = [
  {
    path: 'charcode',
    label: 'CharCode',
    title: 'String.fromCharCode helper',
    blurb: 'Rebuild an XSS payload so characters a filter strips are reconstructed at runtime.',
    render: (openModal, burst) => <CharCodeTool openModal={openModal} onBurst={burst} />,
  },
  {
    path: 'charcode-advanced',
    label: 'CharCode (adv)',
    title: 'String.fromCharCode — advanced (period-free)',
    blurb: 'Brackets the method call too, so the output contains no periods at all.',
    render: (openModal, burst) => <CharCodeTool advanced openModal={openModal} onBurst={burst} />,
  },
  {
    path: 'cookie',
    label: 'Cookie',
    title: 'Stay-logged-in cookie forger',
    blurb: 'Builds base64(username + ":" + md5(password)) for cookie-forging attacks.',
    render: (openModal, burst) => <Md5CookieTool openModal={openModal} onBurst={burst} />,
  },
  {
    path: 'encoder',
    label: 'Encoder',
    title: 'Encoder playground',
    blurb: 'Every encoding that smuggles a payload past a filter, each with its Hackvertor equivalent.',
    render: (openModal, burst) => <EncoderTool openModal={openModal} onBurst={burst} />,
  },
  {
    path: 'csrf',
    label: 'CSRF',
    title: 'CSRF PoC builder',
    blurb: 'Auto-submitting exploit page with toggles for the token field, referrer, pushState, and cookie-set.',
    render: (openModal, burst) => <CsrfPoc openModal={openModal} onBurst={burst} />,
  },
];

function Layout() {
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);
  return (
    <>
      <MatrixRain />
      <div className="header-stack">
        <TopBar links={WIDGETS} />
      </div>
      <Outlet context={{ openModal: setModal, burst: burstMatrix }} />
      <footer>@ohhaiohhai/burp-widgets · live demo · everything runs client-side</footer>
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
    </>
  );
}

function Home() {
  return (
    <main className="wrap">
      <header className="page-head">
        <div className="kicker">@ohhaiohhai/burp-widgets</div>
        <h1>Interactive security widgets</h1>
        <p className="goal">
          Standalone React widgets for Burp Suite / BSCP workflows, extracted from the BSCP notes
          site. Pick a widget below — everything runs entirely in your browser, nothing is sent
          anywhere. Try the theme, accent, and Matrix-rain controls up top.
        </p>
      </header>
      <div className="cards">
        {WIDGETS.map((w) => (
          <NavLink key={w.path} to={'/' + w.path} className="card">
            <div className="num">WIDGET</div>
            <h3>{w.title}</h3>
            <p>{w.blurb}</p>
          </NavLink>
        ))}
      </div>
    </main>
  );
}

function WidgetPage({ w }) {
  const { openModal, burst } = useOutletContext();
  return (
    <main className="wrap">
      <header className="page-head">
        <div className="kicker">Widget</div>
        <h1>{w.title}</h1>
        <p className="goal">{w.blurb}</p>
      </header>
      <section className="section">
        <h2>{w.label} <span className="tag">widget</span></h2>
        {w.render(openModal, burst)}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EffectsProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            {WIDGETS.map((w) => (
              <Route key={w.path} path={w.path} element={<WidgetPage w={w} />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </EffectsProvider>
  </StrictMode>
);
