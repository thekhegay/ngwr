import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Folder, Moon, ShieldCheck, Terminal, Zap } from 'lucide';
import { WrBlurText } from 'ngwr/blur-text';
import { WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrDecryptText } from 'ngwr/decrypt-text';
import { WrGlitchText } from 'ngwr/glitch-text';
import { WrGradientText } from 'ngwr/gradient-text';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrRotatingText } from 'ngwr/rotating-text';
import { WrShinyText } from 'ngwr/shiny-text';
import { WrSplitText } from 'ngwr/split-text';
import { WrToast } from 'ngwr/toast';
import { WrTypewriter } from 'ngwr/typewriter';
import { WrTypography } from 'ngwr/typography';

import { ComponentsBento } from './components-bento/components-bento';

import { Footer } from '../_layout/footer/footer';

import { DocCodeComponent } from '#core/components';
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
  imports: [
    RouterLink,
    WrIcon,
    WrButton,
    WrTag,
    WrTypography,
    // Motion kit
    WrRotatingText,
    WrGradientText,
    WrBlurText,
    WrSplitText,
    WrShinyText,
    WrGlitchText,
    WrDecryptText,
    WrTypewriter,
    // Sections
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
  protected readonly routes = routes;

  /** Words that the hero `<wr-typewriter>` types, deletes, and cycles. */
  protected readonly typewriterWords: readonly string[] = [
    'stylish',
    'accessible',
    'themeable',
    'production-grade',
    'delightful',
  ];

  /** Sample sign-up card shown in the DX section — goes through Shiki. */
  protected readonly snippet = `import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrBtn } from 'ngwr/button';
import { WrFormField } from 'ngwr/form-field';
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
    },
    {
      icon: 'eye',
      title: 'Every visual is a token',
      description:
        'Every color, radius, spacing, and duration is a `--wr-*` variable. Re-skin one component or all of them.',
      accent: 'secondary',
    },
    {
      icon: 'terminal',
      title: 'Standalone, zoneless',
      description:
        'Every component is a standalone import. Works the same in CLI, Vite, SSR with hydration, and zoneless apps.',
      accent: 'primary',
    },
    {
      icon: 'folder',
      title: 'Pay for what you import',
      description:
        "Each component is its own ng-packagr entry. What you don't import never lands in your bundle.",
      accent: 'success',
    },
    {
      icon: 'moon',
      title: 'Dark mode is first-class',
      description:
        '`[data-theme]` flips at the root or any subtree. `prefers-color-scheme` is one provider option, not a hardcoded check.',
      accent: 'warning',
    },
    {
      icon: 'flash',
      title: 'Motion you can trust',
      description:
        "One easing curve shared by overlays, hovers, presses, route changes. `prefers-reduced-motion` short-circuits the lot.",
      accent: 'danger',
    },
  ];

  private readonly toast = inject(WrToast);

  constructor() {
    const meta = inject(MetaService);
    meta.setCanonicalURL();
    meta.setTitle(null);
    meta.setDescription(
      'ngwr — standalone, signals-first Angular components. Token-driven theming, a11y in the lib, dark mode first.'
    );
    meta.setKeywords(['home', 'landing', 'angular components', 'ngwr', 'signals', 'standalone']);
  }
}
