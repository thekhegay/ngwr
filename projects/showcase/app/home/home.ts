import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Folder, Moon, ShieldCheck, Terminal, Zap } from 'lucide';
import { WrButton } from 'ngwr/button';
import { WrCopyToClipboard } from 'ngwr/directives';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrToast } from 'ngwr/toast';
import { WrTypography } from 'ngwr/typography';
import { NGWR_VERSION_TOKEN } from 'ngwr/version';

import { ComponentsBento } from './components-bento/components-bento';

import { BRAND_ICONS } from '#core/icons';
import { MetaService } from '#core/services';
import { routes } from '#routing';

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
  imports: [RouterLink, WrIcon, WrButton, WrTypography, WrCopyToClipboard, ComponentsBento],
  providers: [
    provideWrIcons([
      ...BRAND_ICONS,
      ...lucideIcons({
        folder: Folder,
        moon: Moon,
        flash: Zap,
        terminal: Terminal,
        'shield-checkmark': ShieldCheck,
      }),
    ]),
  ],
})
export default class HomeComponent {
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
