import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrAlert } from 'ngwr/alert';
import { WrAvatar } from 'ngwr/avatar';
import { WrButton } from 'ngwr/button';
import { WrCopyToClipboard } from 'ngwr/directives';
import { provideWrIcons, type WrIconDef, WrIcon, wrIconSet } from 'ngwr/icon';
import { WrInput, WrInputGroup, WrInputPrefix, WrPasswordToggle } from 'ngwr/input';
import { WrProgress } from 'ngwr/progress';
import { WrQr } from 'ngwr/qr';
import { WrSkeleton } from 'ngwr/skeleton';
import { WrTag } from 'ngwr/tag';
import { WrToast } from 'ngwr/toast';
import { WrTypography } from 'ngwr/typography';
import { NGWR_VERSION_TOKEN } from 'ngwr/version';

import { MetaService } from '#core/services';
import { routes } from '#routing';

/** Fisher–Yates shuffle. Returns a new array. */
function shuffle<T>(input: readonly T[]): T[] {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface WhyTile {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly accent: 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'secondary';
}

@Component({
  selector: 'ngwr-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    WrIcon,
    WrQr,
    WrProgress,
    WrAvatar,
    WrAlert,
    WrTag,
    WrSkeleton,
    WrButton,
    WrInput,
    WrInputGroup,
    WrInputPrefix,
    WrPasswordToggle,
    WrTypography,
    WrCopyToClipboard,
  ],
  providers: [provideWrIcons(wrIconSet)],
})
export default class HomeComponent {
  protected readonly currentDate = new Date();
  protected readonly icons: readonly WrIconDef[] = shuffle(wrIconSet).slice(0, 30);
  protected readonly routes = routes;
  protected readonly version = inject(NGWR_VERSION_TOKEN);

  /** Install command for the hero terminal field. */
  protected readonly installCmd = 'pnpm add ngwr';

  /** Snippet shown in the "Zero config" code card. */
  protected readonly snippet = `import { Component } from '@angular/core';
import { WrButton } from 'ngwr/button';
import { WrInput } from 'ngwr/input';

@Component({
  selector: 'signup-card',
  imports: [WrInput, WrButton],
  template: \`
    <input wrInput placeholder="you@company.dev" />
    <wr-btn color="primary">Reserve your spot →</wr-btn>
  \`,
})
export class SignupCard {}`;

  /** "Why ngwr" tiles. */
  protected readonly whyTiles: readonly WhyTile[] = [
    {
      icon: 'shield-checkmark',
      title: 'Accessible',
      description: 'WCAG 2.1 AA. Keyboard nav, focus rings, ARIA, screen-reader labels baked in.',
      accent: 'info',
    },
    {
      icon: 'eye',
      title: 'Themeable',
      description: 'CSS variables + token-driven colors. Re-skin the whole library from one root file.',
      accent: 'secondary',
    },
    {
      icon: 'terminal',
      title: 'Framework-agnostic',
      description: 'Standalone components, signals, SSR-ready. No bundler magic, no zone.js needed.',
      accent: 'primary',
    },
    {
      icon: 'folder',
      title: 'Tree-shakeable',
      description: 'Each component is its own ng-packagr entry. Average button under 2kb gzip.',
      accent: 'success',
    },
    {
      icon: 'moon',
      title: 'Dark-mode first',
      description: 'Designed in the dark, polished in the light. Auto-switch via [data-theme] or OS.',
      accent: 'warning',
    },
    {
      icon: 'flash',
      title: 'Smooth animations',
      description: 'Hand-crafted easings for hover, press, enter, scroll. Reduced-motion respected.',
      accent: 'danger',
    },
  ];

  private readonly toast = inject(WrToast);

  constructor() {
    const meta = inject(MetaService);
    meta.setCanonicalURL();
    meta.setTitle(null);
    meta.setDescription(
      'NGWR — open source Angular 21 components. Standalone, signals-first, bring-your-own design system.'
    );
    meta.setKeywords(['home', 'landing', 'angular components', 'ngwr']);
  }

  protected onCopied(): void {
    this.toast.show({ type: 'success', message: 'Copied install command' });
  }
}
