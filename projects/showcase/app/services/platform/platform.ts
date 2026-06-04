import { Component, inject } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

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

  protected readonly prefersDark = this.platformService.prefersDark;
  protected readonly prefersReducedMotion = this.platformService.prefersReducedMotion;
  protected readonly isBrowser = this.platformService.isBrowser;

  protected readonly snippets = {
    usage: `private readonly platform = inject(WrPlatform);

if (this.platform.isBrowser) {
  localStorage.setItem('theme', 'dark');
}

protected readonly dark = this.platform.prefersDark;       // Signal<boolean>
protected readonly reduce = this.platform.prefersReducedMotion;`,
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
}
