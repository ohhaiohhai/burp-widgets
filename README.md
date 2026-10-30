# @ohhaiohhai/burp-widgets

Interactive React widgets for Burp Suite / BSCP workflows, extracted from the
BSCP notes site. Everything runs **entirely client-side** — nothing is sent
anywhere.

**Live demo:** https://ohhaiohhai.github.io/burp-widgets/

## Widgets

| Export | What it does |
| --- | --- |
| `CharCodeTool` | Rewrites an XSS payload so characters a filter strips are rebuilt at runtime via `String.fromCharCode` (+ bracketed property access). `advanced` prop drops periods entirely. |
| `Md5CookieTool` | Builds a forgeable "stay-logged-in" cookie: `base64(username + ":" + md5(password))`. |
| `EncoderTool` | URL / double-URL / HTML-entity / hex-entity / base64 / unicode encodings of a payload, each with its Hackvertor-tag equivalent. |
| `CsrfPoc` | Auto-submitting CSRF exploit page with toggles for the token field, no-referrer meta, `pushState` Referer trick, and a CRLF `Set-Cookie` double-submit bypass. |

Also exported: `CodeBlock` (token-aware), `VAR_DEFS`, `renderTokens`, `md5`, `b64utf8`.

## Install

```sh
npm install @ohhaiohhai/burp-widgets
```

`react` / `react-dom` (^18) are peer dependencies.

## Usage

```jsx
import { CharCodeTool, EncoderTool, CsrfPoc } from '@ohhaiohhai/burp-widgets';
import '@ohhaiohhai/burp-widgets/styles.css';

function Tools() {
  return (
    <>
      <CharCodeTool />
      <EncoderTool />
      <CsrfPoc />
    </>
  );
}
```

### Host integration seams

Each widget works bare, but takes optional props so a host app can wire in its
own behavior:

- **`openModal({ code, label })`** — opens your "view" popup. When omitted, the
  inline **view** button is hidden.
- **`onBurst()`** — called on a successful copy (e.g. to trigger an effect).
- **`CsrfPoc` also takes `CodeBlock`** — inject your own (globally token-aware)
  code block; defaults to this package's self-contained `CodeBlock`.

```jsx
<CharCodeTool openModal={openModal} onBurst={burstEffect} />
<CsrfPoc CodeBlock={MyGlobalCodeBlock} openModal={openModal} />
```

If your app already defines the design-token CSS variables (`--bg`, `--accent`,
…), you can skip importing `styles.css` and the widgets inherit your theme.

## Development

```sh
npm install
npm run dev          # run the demo app (demo/)
npm run build        # build the library -> dist/
npm run build:demo   # build the demo    -> demo-dist/
npm run deploy:pages # build the demo + publish it to the gh-pages branch
```

## License

MIT
