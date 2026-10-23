import { Component } from '@angular/core';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

/** One row of the directive table. */
interface CspDirective {
  readonly name: string;
  readonly value: string;
  readonly why: string;
}

@Component({
  selector: 'ngwr-gs-csp-page',
  templateUrl: './csp.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class CspGuidePageComponent {
  protected readonly snippets = {
    clientRendered: `Content-Security-Policy:
  default-src 'self';
  script-src  'self';
  style-src   'self';
  img-src     'self' data: blob:;
  font-src    'self';
  base-uri    'self';
  object-src  'none'`,

    styles: `// styles.scss: one @use per component you render
@use 'ngwr/theme';
@use 'ngwr/button';
@use 'ngwr/bits/split-text';`,

    nonce: `// main.ts
import { CSP_NONCE } from '@angular/core';

bootstrapApplication(App, {
  providers: [{ provide: CSP_NONCE, useValue: window.__cspNonce }],
});`,

    ssr: `# Server-rendered: a fresh nonce per response
Content-Security-Policy:
  style-src 'self' 'nonce-<per-response-random>';

# Static prerender (outputMode: 'static')
Content-Security-Policy:
  style-src 'self' 'unsafe-inline';`,
  };

  protected readonly directives: readonly CspDirective[] = [
    { name: 'script-src', value: "'self'", why: 'No eval, Worker or WebAssembly.' },
    { name: 'style-src', value: "'self'", why: "When you @use ngwr's styles." },
    {
      name: 'img-src',
      value: "'self' data: blob:",
      why: 'data: for QR code and image cropper, blob: for file exports.',
    },
    { name: 'connect-src', value: "'self'", why: 'Only your own requests. ngwr fetches nothing.' },
    { name: "'unsafe-eval'", value: '—', why: "Not needed, nor is 'wasm-unsafe-eval'." },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Theming',
      url: ['/guides', 'theming'],
      description: 'The style entries.',
    },
    {
      kind: 'Guide',
      title: 'Tokens',
      url: ['/guides', 'tokens'],
      description: 'The --wr-* custom properties.',
    },
  ];
}
