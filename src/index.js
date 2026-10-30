/*
 * @ohhaiohhai/burp-widgets — public entry point.
 *
 * Four self-contained React widgets extracted from the BSCP notes site, plus the
 * token-aware CodeBlock they build on. Each tool couples to a host app only
 * through injectable props with safe defaults, so a bare <CharCodeTool /> works
 * standalone (see the demo) while a host can wire its own modal / copy-effect /
 * CodeBlock in:
 *   - openModal({ code, label })  — opens the host's "view" modal; the inline
 *                                   "view" button is hidden when not provided.
 *   - onBurst()                   — fired on a successful copy (e.g. an effect).
 *   - CsrfPoc also takes CodeBlock — defaults to this package's CodeBlock; pass
 *                                   your own to reuse a global token system.
 */
export { default as CharCodeTool } from './CharCodeTool.jsx';
export { default as Md5CookieTool } from './Md5CookieTool.jsx';
export { default as EncoderTool } from './EncoderTool.jsx';
export { default as CsrfPoc } from './CsrfPoc.jsx';
export { default as CodeBlock, VAR_DEFS, renderTokens } from './CodeBlock.jsx';
export { md5, b64utf8 } from './lib/md5.js';
