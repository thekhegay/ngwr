import { Component, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrHaptics, WrPlatform } from 'ngwr/platform';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-platform-page',
  templateUrl: './platform.html',
  imports: [
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class PlatformServicePageComponent {
  private readonly platformService = inject(WrPlatform);
  protected readonly haptics = inject(WrHaptics);
  protected readonly hapticsSupported = this.haptics.supported;

  protected readonly prefersDark = this.platformService.prefersDark;
  protected readonly prefersReducedMotion = this.platformService.prefersReducedMotion;
  protected readonly isBrowser = this.platformService.isBrowser;

  protected readonly snippets = {
    usage: `private readonly platform = inject(WrPlatform);

if (this.platform.isBrowser) {
  localStorage.setItem('theme', 'dark');
}

protected readonly dark = this.platform.prefersDark; // Signal<boolean>
protected readonly reduce = this.platform.prefersReducedMotion; // Signal<boolean>`,
    haptics: `private readonly haptics = inject(WrHaptics);

this.haptics.warning(); // before a destructive action
this.haptics.selection(); // on a switch or segmented change
this.haptics.supported; // false on the server and in iOS Safari`,
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

  protected readonly hapticsApi: readonly DocApiRow[] = [
    {
      name: 'supported',
      description: 'Whether the Vibration API exists. `false` on iOS Safari.',
      type: 'boolean',
      default: '—',
    },
    {
      name: 'vibrate(pattern)',
      description: 'Vibrate for ms, or a `[buzz, pause, …]` pattern. `0` or `[]` cancels.',
      type: '(number | readonly number[]) => boolean',
      default: '—',
    },
    {
      name: 'impact(strength?)',
      description: 'A tap: `light`, `medium` or `heavy`.',
      type: "('light'|'medium'|'heavy') => boolean",
      default: "'medium'",
    },
    {
      name: 'selection()',
      description: 'A subtle tick for a discrete change.',
      type: '() => boolean',
      default: '—',
    },
    {
      name: 'success() / warning() / error()',
      description: 'Pulses for a done, risky or failed action.',
      type: '() => boolean',
      default: '—',
    },
    { name: 'stop()', description: 'Cancel any in-progress vibration.', type: '() => void', default: '—' },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Server-side rendering',
      url: ['/guides', 'ssr'],
    },
  ];
}
