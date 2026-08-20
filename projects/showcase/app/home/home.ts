import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Folder, ListChecks, Moon, Play, ShieldCheck, Terminal } from 'lucide';
import { WrTag } from 'ngwr/badge';
import { WrBlurText } from 'ngwr/blur-text';
import { WrButton } from 'ngwr/button';
import { WrDecryptText } from 'ngwr/decrypt-text';
import { WrGlitchText } from 'ngwr/glitch-text';
import { WrGradientText } from 'ngwr/gradient-text';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrRotatingText } from 'ngwr/rotating-text';
import { WrShinyText } from 'ngwr/shiny-text';
import { WrSplitText } from 'ngwr/split-text';
import { WrSpotlightCard } from 'ngwr/spotlight-card';
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
        play: Play,
        terminal: Terminal,
        'form-check': ListChecks,
        'shield-checkmark': ShieldCheck,
      }),
    ]),
  ],
})
export default class HomeComponent {
  protected readonly replayTick = signal(0);

  protected readonly routes = routes;

  /**
   * What the hero rotates through. Each of the three is a literal count of
   * zero **in `projects/lib`**, which is the only reason the fold is allowed to
   * be this specific: there, `ControlValueAccessor` occurs solely in JSDoc
   * explaining that it is gone, and `@NgModule` / `@Input(` / `@Output(` /
   * `@HostListener` do not occur at all. The scope matters — a repo-wide grep
   * hits `projects/showcase` too, this page included, and the comparison table
   * even builds a deliberate strawman that implements one
   * (`start/comparison/comparison.ts`). "In the library" is the claim; the repo
   * is not the library. Re-grep before adding a fourth — a claim in the fold is
   * the one a reader checks first.
   *
   * The slot is width-reserved in SCSS so the tail of the sentence does not
   * shuffle every 2.6s; `ControlValueAccessor` is the longest at 20 chars.
   */
  protected readonly absences: readonly string[] = ['ControlValueAccessor', 'NgModule', '@Input() decorator'];

  /**
   * Sample sign-up card shown in the DX section — goes through Shiki.
   *
   * Kept to the shape a consumer actually writes, and to API this repo's own
   * specs use (`projects/lib/form/testing/wr-form-field-harness.spec.ts` binds
   * `[formField]` to `wrInput` exactly like this). The point of the sample is
   * the two bindings: nothing sits between the field and the component.
   */
  protected readonly snippet = `import { Component, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';

import { WrButton } from 'ngwr/button';
import { WrCheckbox } from 'ngwr/checkbox';
import { WrFormField } from 'ngwr/form';
import { WrInput } from 'ngwr/input';

@Component({
  selector: 'signup-card',
  imports: [FormField, WrFormField, WrInput, WrCheckbox, WrButton],
  template: \`
    <wr-form-field label="Work email" required>
      <input wrInput type="email" [formField]="signup.email" />
    </wr-form-field>

    <wr-checkbox [formField]="signup.agree">I agree to the terms</wr-checkbox>

    <wr-btn color="primary" block (click)="reserve()">
      Reserve your spot
    </wr-btn>
  \`,
})
export class SignupCard {
  private readonly model = signal({ email: '', agree: false });

  // \`signup.email\` writes the input's value and \`signup.agree\` the checkbox's
  // \`checked\` model. No ControlValueAccessor — there is not one in the library.
  // The "required" and "not an email" copy comes from the i18n catalog, so no
  // <wr-form-error> has to be written unless this field wants its own wording.
  protected readonly signup = form(this.model, path => {
    required(path.email);
    email(path.email);
  });

  protected reserve(): void {}
}`;

  /**
   * "Why ngwr" tiles. The forms tile leads because it is the sharpest wedge
   * the library has — what the other Angular UI libraries do about Signal
   * Forms today is laid out, with counts, on `start/comparison`, and the tile
   * deliberately claims only what is true of this package. The motion tile
   * that used to sit here was cut rather than demoted: the animation gallery
   * immediately below makes the same point with the components themselves.
   *
   * The descriptions render through interpolation, so backticks land on the
   * page as literal characters — keep the marked-up terms to the one or two
   * that carry the tile.
   *
   * "Eighteen" is derived, not chosen; the derivation sits in the comment above
   * the hero paragraph in `home.html`. A naive re-grep answers nineteen.
   */
  protected readonly whyTiles: readonly WhyTile[] = [
    {
      icon: 'form-check',
      title: 'Signal Forms, natively',
      description:
        "Eighteen value controls implement a Signal Forms interface, so `[formField]` binds to the component's own value or checked model. No `ControlValueAccessor` anywhere in the library.",
      accent: 'primary',
      spotlight: 'rgba(var(--wr-color-primary-rgb), 0.14)',
    },
    {
      icon: 'terminal',
      title: 'Zoneless by construction',
      description:
        'Not zoneless-compatible — zoneless in the source. Signal inputs, signal state, `afterNextRender()` for DOM work, and zero `@NgModule`s or `@Input()` decorators.',
      accent: 'info',
      spotlight: 'rgba(var(--wr-color-primary-rgb), 0.14)',
    },
    {
      icon: 'shield-checkmark',
      title: 'A11y is gated, not claimed',
      description:
        'Three axe gates run against the built site: structure on every PR, painted contrast and in-overlay states nightly. A serious violation is a red build.',
      accent: 'danger',
      spotlight: 'rgba(var(--wr-color-danger-rgb), 0.14)',
    },
    {
      icon: 'eye',
      title: 'Themed by tokens, not overrides',
      // Not "every visual is a token": a handful of colours are deliberately
      // absolute and could not be anything else — the colour picker's own hue
      // and alpha ramps, and `wr-window`'s macOS traffic lights.
      description:
        'Color, radius, spacing, and duration come from `--wr-*` custom properties — and a token nothing paints with has to justify itself to the lint run. Re-skin one component or all of them.',
      accent: 'secondary',
      spotlight: 'rgba(var(--wr-color-medium-rgb, 113, 128, 150), 0.14)',
    },
    {
      icon: 'folder',
      title: 'Pay for what you import',
      description:
        "202 entry points, each its own ng-packagr build. What you don't import never lands in your bundle — the SCSS opts in per component too.",
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
  ];

  constructor() {
    // Re-mount the one-shot motion tiles every few seconds so the gallery
    // keeps moving — split/blur/decrypt animate on mount only. The hero's own
    // rotator needs no help here: `<wr-rotating-text>` advances itself, and it
    // guards its own timer on the platform, which the old hero-word interval
    // did not.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const id = setInterval(() => this.replayTick.update(v => v + 1), 7000);
      inject(DestroyRef).onDestroy(() => clearInterval(id));
    }

    const meta = inject(MetaService);
    meta.setCanonicalURL();
    // The title is the one string a search result shows, so it names the wedge
    // rather than the category. "Angular UI components library" competed for a
    // generic term against every incumbent and said nothing a reader could act
    // on; measured before the change, ngwr was findable by its own name and
    // absent from the results for what it actually does.
    meta.setTitle('The Angular UI library for Signal Forms');
    meta.setDescription(
      'An Angular UI library that binds straight to Signal Forms: eighteen value controls implement FormValueControl or FormCheckboxControl — no accessor layer.'
    );
    meta.setKeywords([
      'home',
      'landing',
      'angular components',
      'ngwr',
      'signal forms',
      'formvaluecontrol',
      'signals',
      'zoneless',
      'standalone',
    ]);
  }
}
