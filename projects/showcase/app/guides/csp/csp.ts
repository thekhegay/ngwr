import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-gs-csp-page',
  templateUrl: './csp.html',
  imports: [
    RouterLink,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class CspGuidePageComponent {
  protected readonly snippets = {
    clientRendered: `# Client-rendered app that imports ngwr's stylesheet.
Content-Security-Policy:
  default-src 'self';
  script-src  'self';
  style-src   'self';
  img-src     'self' data: blob:;
  font-src    'self';
  base-uri    'self';
  object-src  'none'`,

    styles: `// styles.scss — this is what makes 'self' enough for ngwr.
@use 'ngwr';           // every component, in the linked stylesheet

// …or per component, if you are trimming:
@use 'ngwr/button';
@use 'ngwr/split-text';`,

    nonce: `// main.ts — only needed if you do NOT import the stylesheet above.
import { CSP_NONCE } from '@angular/core';

bootstrapApplication(App, {
  providers: [{ provide: CSP_NONCE, useValue: window.__cspNonce }],
});`,

    ssr: `# Server-rendered or prerendered: Angular writes component CSS into the
# document as <style ng-app-id="ng"> before any client code runs, so a nonce
# has to be produced by whatever renders the response.
Content-Security-Policy:
  style-src 'self' 'nonce-<per-response-random>';

# A statically prerendered site (outputMode: 'static') cannot vary the nonce
# per response. Serve it with hashes, or accept:
Content-Security-Policy:
  style-src 'self' 'unsafe-inline';`,

    docsSite: `# ngwr.dev itself, for reference. The extra directive is the docs
# highlighter (shiki compiles an Oniguruma WebAssembly module), NOT the library.
Content-Security-Policy:
  script-src 'self' 'wasm-unsafe-eval';
  style-src  'self' 'unsafe-inline';`,
  };

  protected readonly directives: readonly DocApiRow[] = [
    {
      name: 'script-src',
      description:
        "`'self'` is enough. The library contains no `eval`, no `new Function`, no `Worker` and no WebAssembly — verified by sweeping `projects/lib` and by running the built site under a policy with none of the escape hatches.",
      type: 'directive',
      default: "'self'",
    },
    {
      name: 'style-src',
      description:
        "`'self'` is enough **if** your app imports ngwr's stylesheet. Every component's CSS then lives in your linked stylesheet. Without that import, see the nonce section below.",
      type: 'directive',
      default: "'self'",
    },
    {
      name: 'img-src',
      description:
        '`data:` is needed by `<wr-qr>` and by `<wr-image-cropper>` (both hand you a canvas as a data URL); `blob:` by anything that exports a file, including the table CSV download.',
      type: 'directive',
      default: "'self' data: blob:",
    },
    {
      name: 'connect-src',
      description:
        'Only what your own app fetches. The library makes no network calls of its own — `WrI18nHttpLoader` uses whatever URL you configure, and the icon adapters take the icon data as an argument rather than fetching it.',
      type: 'directive',
      default: "'self'",
    },
    {
      name: "'wasm-unsafe-eval'",
      description:
        'Not needed. No entry point compiles WebAssembly. The canvas and WebGL components (`aurora`, `waves`, `splash-cursor`, `click-spark`, `fuzzy-text`, `confetti`) use `getContext` and nothing else, which CSP does not govern.',
      type: 'not required',
      default: '—',
    },
    {
      name: "'unsafe-eval'",
      description: 'Not needed. Nothing in the library reaches for the string-to-code APIs.',
      type: 'not required',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Theming',
      url: ['/guides', 'theming'],
      description: "Where the stylesheet import lives, and what `@use 'ngwr'` pulls in.",
    },
    {
      kind: 'Guide',
      title: 'Tokens',
      url: ['/guides', 'tokens'],
      description: 'The `--wr-*` custom properties. Setting them is CSSOM, which CSP never blocks.',
    },
  ];
}
