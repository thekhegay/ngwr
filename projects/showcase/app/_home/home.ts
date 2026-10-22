import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BadgeCheck, Folder, ListChecks, Moon, ShieldCheck, Terminal, TextCursorInput } from 'lucide';
import { WrTag } from 'ngwr/badge';
import { WrBlurText } from 'ngwr/bits/blur-text';
import { WrBorderGlow } from 'ngwr/bits/border-glow';
import { WrDecryptText } from 'ngwr/bits/decrypt-text';
import { WrGlitchText } from 'ngwr/bits/glitch-text';
import { WrGradientText } from 'ngwr/bits/gradient-text';
import { WrRotatingText } from 'ngwr/bits/rotating-text';
import { WrShinyText } from 'ngwr/bits/shiny-text';
import { WrSplitText } from 'ngwr/bits/split-text';
import { WrSpotlightCard } from 'ngwr/bits/spotlight-card';
import { WrTypewriter } from 'ngwr/bits/typewriter';
import { WrWaves } from 'ngwr/bits/waves';
import { WrButton } from 'ngwr/button';
import { WrCard } from 'ngwr/card';
import { lucideIcons, provideWrIcons, WrIcon } from 'ngwr/icon';
import type { WrColor } from 'ngwr/theme';
import { WrTypography } from 'ngwr/typography';

import { Footer } from '../_layout/footer/footer';

import { ComponentsBento } from './components-bento/components-bento';
import { HomeOptInComponent } from './opt-in/opt-in';

import { DocCodeComponent } from '#core/components';
import { QUALITY } from '#core/generated/quality';
import { BRAND_ICONS } from '#core/icons';
import { MetaService } from '#core/services';
import { ROUTES, wrPath } from '#routes';

interface WhyTile {
  readonly icon: string;
  readonly title: string;
  /** Prose; a `backtick` run renders as inline code. */
  readonly description: string;
  /**
   * One or two lines that show the claim rather than restate it. Rendered in a
   * `<pre>` through interpolation, so it is plain text: no highlighting, and
   * the newline is the line break.
   */
  readonly code: string;
  /**
   * `neutral` is the name v15 gave this job on `wr-timeline-item`, and the
   * reason it is spelled out rather than borrowed: `secondary` was one of the
   * four intents that release deleted, and the tile using it only looked fine
   * because its rule quietly redirected to `--wr-color-on-surface-muted`. A
   * union listing a token the theme does not have is what the next tile gets
   * written against.
   */
  readonly accent: WrColor | 'neutral';
  /** Hover-spotlight tint — tracks the icon accent. */
  readonly spotlight: string;
}

/** One quiet link card under the DX copy. */
interface DxLink {
  readonly icon: string;
  readonly label: string;
  readonly url: string;
}

@Component({
  selector: 'ngwr-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  imports: [
    RouterLink,
    WrIcon,
    WrButton,
    WrCard,
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
    WrBorderGlow,
    // Sections
    WrSpotlightCard,
    ComponentsBento,
    HomeOptInComponent,
    DocCodeComponent,
    Footer,
  ],
  providers: [
    provideWrIcons([
      ...BRAND_ICONS,
      ...lucideIcons({
        folder: Folder,
        moon: Moon,
        terminal: Terminal,
        'form-check': ListChecks,
        'form-input': TextCursorInput,
        'badge-check': BadgeCheck,
        'shield-checkmark': ShieldCheck,
      }),
    ]),
  ],
})
export default class HomeComponent {
  protected readonly replayTick = signal(0);

  protected readonly routes = ROUTES;

  /** Absolute link from a node chain — the template cannot call a module function. */
  protected readonly path = wrPath;

  /**
   * Counted by `pnpm gen:quality`, not typed here. The hero and the "Pay for
   * what you import" tile both stated 202 while the package published 204 — a
   * hand-written catalog size is stale one entry point after it is written, and
   * this is the page most readers see first.
   */
  protected readonly entryPoints = QUALITY.entryPoints;

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
  // Each rule carries its own message and <wr-form-field> shows it, so no
  // <wr-form-error> has to be written.
  protected readonly signup = form(this.model, path => {
    required(path.email, { message: 'Enter your work email.' });
    email(path.email, { message: 'That is not an email address.' });
  });

  protected reserve(): void {}
}`;

  /**
   * The Installation page's Compatibility section, as a fragment.
   *
   * Bound from a field rather than written as `fragment="compatibility"`: on a
   * `wr-btn` anchor `check:attrs` reads a static attribute as a mistyped button
   * input, while the template lint refuses a bound string literal.
   */
  protected readonly compatibilityFragment = 'compatibility';

  /** The two doors under the DX copy: how the forms work, and what checks ship. */
  protected readonly dxLinks: readonly DxLink[] = [
    { icon: 'form-input', label: 'Forms guide', url: wrPath(ROUTES.guides, ROUTES.guides.forms) },
    { icon: 'badge-check', label: 'Validators', url: wrPath(ROUTES.reference, ROUTES.reference.validators) },
  ];

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
   * "Twenty" is derived, not chosen; the derivation sits in the comment above
   * the DX checklist in `home.html`. A naive re-grep answers twenty-one.
   */
  protected readonly whyTiles: readonly WhyTile[] = [
    {
      icon: 'form-check',
      title: 'Signal Forms, natively',
      description:
        "Twenty value controls implement a Signal Forms interface, so `[formField]` binds to the component's own value or checked model. No `ControlValueAccessor` anywhere in the library.",
      code: '<input wrInput [formField]="form.email" />',
      accent: 'primary',
      spotlight: 'color-mix(in srgb, var(--wr-color-primary) 14%, transparent)',
    },
    {
      icon: 'terminal',
      title: 'Zoneless by construction',
      description:
        'Not zoneless-compatible — zoneless in the source. Signal inputs, signal state, `afterNextRender()` for DOM work, and zero `@NgModule`s or `@Input()` decorators.',
      code: "readonly size = input<WrButtonSize>('md');\nafterNextRender(() => this.measure());",
      accent: 'info',
      spotlight: 'color-mix(in srgb, var(--wr-color-primary) 14%, transparent)',
    },
    {
      icon: 'shield-checkmark',
      title: 'A11y is gated, not claimed',
      description:
        'Three axe gates run against the built site, for structure, painted contrast and in-overlay states: every night main moves, and before every release. A serious violation is a red build.',
      code: 'pnpm check:a11y\npnpm check:contrast\npnpm check:state-a11y',
      accent: 'danger',
      spotlight: 'color-mix(in srgb, var(--wr-color-danger) 14%, transparent)',
    },
    {
      icon: 'eye',
      title: 'Themed by tokens, not overrides',
      // Not "every visual is a token": a handful of colours are deliberately
      // absolute and could not be anything else — the colour picker's own hue
      // and alpha ramps, and `wr-window`'s macOS traffic lights.
      description:
        'Color, radius, spacing, and duration come from `--wr-*` custom properties — and a read of a token the theme never declares fails the lint run. Re-skin one component or all of them.',
      code: '.wr-btn { --wr-btn-radius: 999px; }',
      accent: 'neutral',
      spotlight: 'color-mix(in srgb, var(--wr-color-on-surface-muted) 14%, transparent)',
    },
    {
      icon: 'folder',
      title: 'Pay for what you import',
      description: `${QUALITY.entryPoints} entry points, each one tree-shakable on its own. What you don't import never lands in your bundle — the SCSS opts in per component too.`,
      code: "import { WrButton } from 'ngwr/button';\n@use 'ngwr/button';",
      accent: 'success',
      spotlight: 'color-mix(in srgb, var(--wr-color-success) 14%, transparent)',
    },
    {
      icon: 'moon',
      title: 'Dark mode is first-class',
      description:
        'Plain CSS `color-scheme`: it follows the OS with no JavaScript and flips at the root or on any subtree, because each token that differs between light and dark carries both sides in `light-dark()`.',
      code: ':root { color-scheme: light dark; }\n.promo { color-scheme: dark; }',
      accent: 'warning',
      spotlight: 'color-mix(in srgb, var(--wr-color-warning) 16%, transparent)',
    },
  ];

  constructor() {
    // Re-mount the one-shot motion tiles every few seconds so the gallery
    // keeps moving — split/blur/decrypt animate on mount only. Deliberately not
    // extended to the hero: re-running the fold's entrance on a timer is the
    // twitch the rotating "Not in the library" line was removed for. The hero
    // plays once on view, over a `<wr-waves>` field that never stops.
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
      'An Angular UI library that binds straight to Signal Forms: twenty value controls implement FormValueControl or FormCheckboxControl — no accessor layer.'
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
