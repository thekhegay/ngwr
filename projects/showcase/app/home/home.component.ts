import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { WrButtonComponent } from 'ngwr/button';
import { WrCopyToClipboardDirective } from 'ngwr/directives';
import { WrIconComponent, provideWrIcons, wrIconSet } from 'ngwr/icon';
import { WrInputDirective, WrInputGroupComponent } from 'ngwr/input';
import { WrKbdComponent } from 'ngwr/keyboard';
import { WrProgressComponent } from 'ngwr/progress';
import { WrSwitchComponent } from 'ngwr/switch';
import { WrTagComponent } from 'ngwr/tag';
import { WrToastService } from 'ngwr/toast';
import { WrTypographyComponent } from 'ngwr/typography';

import { MetaService } from '#core/services';
import { routes } from '#routing';

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
    FormsModule,
    RouterLink,
    WrIconComponent,
    WrButtonComponent,
    WrSwitchComponent,
    WrProgressComponent,
    WrTagComponent,
    WrInputDirective,
    WrInputGroupComponent,
    WrKbdComponent,
    WrTypographyComponent,
    WrCopyToClipboardDirective,
  ],
  providers: [provideWrIcons(wrIconSet)],
})
export default class HomeComponent {
  protected readonly routes = routes;

  /** Live demo state for the components tile. */
  protected readonly neonMode = signal(true);
  protected readonly buildPct = signal(93);
  protected readonly coveragePct = signal(94);

  /** Tag list for the badge tile. */
  protected readonly demoTags = ['Live', 'v1.6.0', 'TypeScript', 'Passed'] as const;

  /** Install command for the hero terminal. */
  protected readonly installCmd = 'pnpm add ngwr';

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

  /** Snippet shown in the "Zero config" code card. */
  protected readonly snippet = `import { Component } from '@angular/core';
import { WrButtonComponent } from 'ngwr/button';
import { WrCardComponent } from 'ngwr/card';
import { WrInputDirective } from 'ngwr/input';

@Component({
  selector: 'signup-card',
  imports: [WrCardComponent, WrInputDirective, WrButtonComponent],
  template: \`
    <wr-card class="p-6">
      <h2 class="wr-text-xl wr-font-bold">Join the waitlist</h2>
      <input wrInput placeholder="you@company.dev" />
      <wr-btn color="primary">Reserve your spot →</wr-btn>
    </wr-card>
  \`,
})
export class SignupCard {}`;

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

  protected demoToast(): void {
    this.toast.show({
      type: 'success',
      title: 'Deployed to production',
      message: 'ngwr.preview.vercel.app',
    });
  }
}
