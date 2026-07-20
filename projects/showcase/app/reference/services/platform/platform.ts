import { Component, inject } from '@angular/core';

import { WrPlatform, WrVisualViewport } from 'ngwr/platform';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-platform-page',
  templateUrl: './platform.html',
  imports: [DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class PlatformServicePageComponent {
  private readonly platformService = inject(WrPlatform);
  private readonly visualViewport = inject(WrVisualViewport);

  protected readonly prefersDark = this.platformService.prefersDark;
  protected readonly prefersReducedMotion = this.platformService.prefersReducedMotion;
  protected readonly isBrowser = this.platformService.isBrowser;

  protected readonly bottomInset = this.visualViewport.bottomInset;
  protected readonly offsetTop = this.visualViewport.offsetTop;

  protected readonly snippets = {
    usage: `private readonly platform = inject(WrPlatform);

if (this.platform.isBrowser) {
  localStorage.setItem('theme', 'dark');
}

protected readonly dark = this.platform.prefersDark;       // Signal<boolean>
protected readonly reduce = this.platform.prefersReducedMotion;`,
    viewport: `private readonly vv = inject(WrVisualViewport);

// Height (px) the on-screen keyboard hides at the bottom — 0 when there
// is none, on the server, or in browsers without the VisualViewport API.
protected readonly keyboard = this.vv.bottomInset;         // Signal<number>

// Also mirrored onto the document root as \`--wr-keyboard-inset\`, so purely
// presentational surfaces can lift above the keyboard with CSS alone:
//   padding-bottom: max(env(safe-area-inset-bottom), var(--wr-keyboard-inset, 0px));`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'isBrowser / isServer', description: 'Synchronous platform check.', type: 'boolean', default: '—' },
    {
      name: 'userAgent',
      description: '`navigator.userAgent` or `null` on the server.',
      type: 'string | null',
      default: '—',
    },
    {
      name: 'prefersDark',
      description: 'Signal mirroring `(prefers-color-scheme: dark)`.',
      type: 'Signal<boolean>',
      default: '—',
    },
    {
      name: 'prefersReducedMotion',
      description: 'Signal mirroring `(prefers-reduced-motion: reduce)`.',
      type: 'Signal<boolean>',
      default: '—',
    },
  ];

  protected readonly viewportApi: readonly DocApiRow[] = [
    {
      name: 'bottomInset',
      description:
        'Height (px) the on-screen keyboard / browser chrome hides at the viewport bottom. `0` when nothing covers it, on the server, or without the API.',
      type: 'Signal<number>',
      default: '—',
    },
    {
      name: 'offsetTop',
      description: "The visual viewport's top offset (px).",
      type: 'Signal<number>',
      default: '—',
    },
  ];
}
