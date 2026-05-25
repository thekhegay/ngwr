import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrAlertComponent } from 'ngwr/alert';
import { WrAvatarComponent } from 'ngwr/avatar';
import { WrButtonComponent } from 'ngwr/button';
import { WrCopyToClipboardDirective } from 'ngwr/directives';
import { provideWrIcons, type WrIcon, WrIconComponent, wrIconSet } from 'ngwr/icon';
import { WrInputDirective, WrInputGroupComponent, WrInputPrefixDirective, WrPasswordToggleComponent } from 'ngwr/input';
import { WrProgressComponent } from 'ngwr/progress';
import { WrQrComponent } from 'ngwr/qr';
import { WrSkeletonComponent } from 'ngwr/skeleton';
import { WrTagComponent } from 'ngwr/tag';
import { WrToastService } from 'ngwr/toast';
import { WrTypographyComponent } from 'ngwr/typography';

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

type WhyTile = {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly accent: 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'secondary';
};

@Component({
  selector: 'ngwr-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    WrIconComponent,
    WrQrComponent,
    WrProgressComponent,
    WrAvatarComponent,
    WrAlertComponent,
    WrTagComponent,
    WrSkeletonComponent,
    WrButtonComponent,
    WrInputDirective,
    WrInputGroupComponent,
    WrInputPrefixDirective,
    WrPasswordToggleComponent,
    WrTypographyComponent,
    WrCopyToClipboardDirective,
  ],
  providers: [provideWrIcons(wrIconSet)],
})
export default class HomeComponent {
  protected readonly currentDate = new Date();
  protected readonly icons: readonly WrIcon[] = shuffle(wrIconSet).slice(0, 30);
  protected readonly routes = routes;

  /** Install command for the hero terminal field. */
  protected readonly installCmd = 'pnpm add ngwr';

  /** Snippet shown in the "Zero config" code card. */
  protected readonly snippet = `import { Component } from '@angular/core';
import { WrButtonComponent } from 'ngwr/button';
import { WrInputDirective } from 'ngwr/input';

@Component({
  selector: 'signup-card',
  imports: [WrInputDirective, WrButtonComponent],
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

  private readonly toast = inject(WrToastService);

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
