import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Folder, Moon, ShieldCheck, Terminal, Zap } from 'lucide';
import { WrTag } from 'ngwr/badge';
import { WrBlurText } from 'ngwr/blur-text';
import { WrButton } from 'ngwr/button';
import { WrDecryptText } from 'ngwr/decrypt-text';
import { WrGlitchText } from 'ngwr/glitch-text';
import { WrGradientText } from 'ngwr/gradient-text';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrRotatingText } from 'ngwr/rotating-text';
import { WrScrambleText } from 'ngwr/scramble-text';
import { WrShinyText } from 'ngwr/shiny-text';
import { WrSplitText } from 'ngwr/split-text';
import { WrSpotlightCard } from 'ngwr/spotlight-card';
import { WrToast } from 'ngwr/toast';
import { WrTypewriter } from 'ngwr/typewriter';
import { WrTypography } from 'ngwr/typography';
import { WrWaves } from 'ngwr/waves';

import { Footer } from '../_layout/footer/footer';

import { ComponentsBento } from './components-bento/components-bento';

import { DocCodeComponent } from '#core/components';
import { BRAND_ICONS } from '#core/icons';
import { MetaService } from '#core/services';
import { routes } from '#routing';

interface WhyTile {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly accent: 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'secondary';
  /** Hover-spotlight tint — tracks the icon accent. */
  readonly spotlight: string;
}

@Component({
  selector: 'ngwr-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  imports: [
    RouterLink,
    WrIcon,
    WrButton,
    WrTag,
    WrTypography,
    // Motion kit
    WrRotatingText,
    WrBlurText,
    WrSplitText,
    WrShinyText,
    WrGlitchText,
    WrDecryptText,
    WrTypewriter,
    WrGradientText,
    WrScrambleText,
    WrWaves,
    // Sections
    WrSpotlightCard,
    ComponentsBento,
    DocCodeComponent,
    Footer,
  ],
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
  protected readonly replayTick = signal(0);

  protected readonly routes = routes;

  /** Three adjectives the hero cycles through via `<wr-split-text>`. Keep each
   * ≤ 7 chars so the title doesn't wrap to a third line when the word swaps. */
  private readonly cyclingWords: readonly string[] = ['stylish', 'modern', 'snappy'];
  private cyclingIndex = 0;
  protected readonly cyclingWord = signal<string>(this.cyclingWords[0]);

  /** Sample sign-up card shown in the DX section — goes through Shiki. */
  protected readonly snippet = `import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrBtn } from 'ngwr/button';
import { WrFormField } from 'ngwr/form';
import { WrInput } from 'ngwr/input';

@Component({
  selector: 'signup-card',
  imports: [FormsModule, WrFormField, WrInput, WrBtn],
  template: \`
    <wr-form-field label="Work email" required>
      <input wrInput type="email" [(ngModel)]="email" />
    </wr-form-field>

    <wr-btn color="primary" block (click)="reserve()">
      Reserve your spot
    </wr-btn>
  \`,
})
export class SignupCard {
  protected readonly email = signal('');

  protected reserve(): void {
    // 1 input, 1 button, 1 signal. No NgModule, no ControlValueAccessor.
  }
}`;

  /** "Why ngwr" tiles. */
  protected readonly whyTiles: readonly WhyTile[] = [
    {
      icon: 'shield-checkmark',
      title: 'A11y in the lib',
      description:
        'Focus traps, ARIA, keyboard nav, screen-reader labels — tested with axe + VoiceOver, not inferred from a doc page.',
      accent: 'info',
      spotlight: 'rgba(var(--wr-color-primary-rgb), 0.14)',
    },
    {
      icon: 'eye',
      title: 'Every visual is a token',
      description:
        'Every color, radius, spacing, and duration is a `--wr-*` variable. Re-skin one component or all of them.',
      accent: 'secondary',
      spotlight: 'rgba(var(--wr-color-medium-rgb, 113, 128, 150), 0.14)',
    },
    {
      icon: 'terminal',
      title: 'Standalone, zoneless',
      description:
        'Every component is a standalone import. Works the same in CLI, Vite, SSR with hydration, and zoneless apps.',
      accent: 'primary',
      spotlight: 'rgba(var(--wr-color-primary-rgb), 0.14)',
    },
    {
      icon: 'folder',
      title: 'Pay for what you import',
      description: "Each component is its own ng-packagr entry. What you don't import never lands in your bundle.",
      accent: 'success',
      spotlight: 'rgba(var(--wr-color-success-rgb), 0.14)',
    },
    {
      icon: 'moon',
      title: 'Dark mode is first-class',
      description:
        '`[data-theme]` flips at the root or any subtree. `prefers-color-scheme` is one provider option, not a hardcoded check.',
      accent: 'warning',
      spotlight: 'rgba(var(--wr-color-warning-rgb), 0.16)',
    },
    {
      icon: 'flash',
      title: 'Motion you can trust',
      description:
        'One easing curve shared by overlays, hovers, presses, route changes. `prefers-reduced-motion` short-circuits the lot.',
      accent: 'danger',
      spotlight: 'rgba(var(--wr-color-danger-rgb), 0.14)',
    },
  ];

  private readonly toast = inject(WrToast);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Re-mount the one-shot motion tiles every few seconds so the gallery
    // keeps moving — split/blur/decrypt animate on mount only.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const id = setInterval(() => this.replayTick.update(v => v + 1), 7000);
      inject(DestroyRef).onDestroy(() => clearInterval(id));
    }

    // Rotate the hero adjective every 2.4s — `<wr-split-text>` watches
    // its `[text]` input and re-runs the per-char animation on change.
    const timer = setInterval(() => {
      this.cyclingIndex = (this.cyclingIndex + 1) % this.cyclingWords.length;
      this.cyclingWord.set(this.cyclingWords[this.cyclingIndex]);
    }, 2400);
    this.destroyRef.onDestroy(() => clearInterval(timer));

    const meta = inject(MetaService);
    meta.setCanonicalURL();
    meta.setTitle('Angular UI components library');
    meta.setDescription(
      'ngwr — standalone, signals-first Angular components. Token-driven theming, a11y in the lib, dark mode first.'
    );
    meta.setKeywords(['home', 'landing', 'angular components', 'ngwr', 'signals', 'standalone']);
  }
}
