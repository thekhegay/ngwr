import { Component } from '@angular/core';

import { DocApiComponent, DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';
import type { DocApiRow } from '#core/components';

@Component({
  selector: 'ngwr-tokens-motion',
  templateUrl: './motion.html',
  styleUrl: './motion.scss',
  imports: [DocApiComponent, DocCodeComponent, DocPageComponent, DocSectionComponent],
})
export default class TokensMotionPage {
  protected readonly easings: readonly DocApiRow[] = [
    {
      name: '--wr-ease-linear',
      type: 'linear',
      description: 'No easing. For continuous motion that should not accelerate — progress bars, spinners, marquees.',
    },
    {
      name: '--wr-ease-out',
      type: 'cubic-bezier(0.16, 1, 0.3, 1)',
      description:
        'The default for anything entering. Fast start, long settle — the element arrives quickly then eases into place.',
    },
    {
      name: '--wr-ease-in',
      type: 'cubic-bezier(0.7, 0, 0.84, 0)',
      description: 'The mirror of `-out`, for anything leaving. Slow start, fast exit.',
    },
    {
      name: '--wr-ease-in-out',
      type: 'cubic-bezier(0.65, 0, 0.35, 1)',
      description: 'Symmetric. For motion that starts and ends on screen — a toggle sliding between two states.',
    },
    {
      name: '--wr-ease-spring',
      type: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      description:
        'Overshoots past the target and settles back. Use sparingly — for playful, attention-drawing motion.',
    },
  ];

  protected readonly durations: readonly DocApiRow[] = [
    {
      name: '--wr-duration-fast',
      type: '0.1s',
      description: 'Hover / focus feedback. Fast enough to feel instant.',
    },
    {
      name: '--wr-duration-base',
      type: '0.15s',
      description: 'The default. State changes on controls — pressed, checked, selected.',
    },
    {
      name: '--wr-duration-slow',
      type: '0.3s',
      description: 'Motion that covers distance — a drawer sliding, a panel expanding.',
    },
    {
      name: '--wr-duration-slower',
      type: '0.5s',
      description: 'Deliberate, full-screen motion. Rare.',
    },
  ];

  protected readonly transitions: readonly DocApiRow[] = [
    {
      name: '--wr-transition-short',
      type: 'var(--wr-duration-fast) var(--wr-ease-out)',
      description: 'Duration + easing for hover / focus feedback.',
    },
    {
      name: '--wr-transition-base',
      type: 'var(--wr-duration-base) var(--wr-ease-linear)',
      description: 'Duration + easing for the common control state change.',
    },
    {
      name: '--wr-transition-long',
      type: 'var(--wr-duration-slow) var(--wr-ease-out)',
      description: 'Duration + easing for motion that travels.',
    },
  ];

  protected readonly overlayTokens: readonly DocApiRow[] = [
    {
      name: '--wr-overlay-duration',
      type: 'var(--wr-duration-base)',
      description: 'Open / close timing shared by every overlay panel — dialog, drawer, select, tooltip, context menu.',
    },
    {
      name: '--wr-overlay-ease',
      type: 'var(--wr-ease-out)',
      description: 'Easing shared by every overlay panel. Retune both here and the whole overlay layer follows.',
    },
  ];

  protected readonly snippets = {
    compose: `/* The shorthands carry duration + easing — NOT the property.
   Name the property yourself, then hand it the token. */
.my-control {
  transition: background-color var(--wr-transition-base),
              box-shadow var(--wr-transition-short);
}

/* Or compose the parts when you need a one-off pairing: */
.my-drawer {
  transition: transform var(--wr-duration-slow) var(--wr-ease-out);
}`,

    retune: `/* Retune globally — every component that reads the tokens follows.
   Halving the durations makes the whole UI feel snappier at a stroke. */
:root {
  --wr-duration-fast: 0.05s;
  --wr-duration-base: 0.08s;
  --wr-duration-slow: 0.15s;
}

/* Overlays share one timing hook, so the whole layer retunes together: */
:root {
  --wr-overlay-duration: var(--wr-duration-slow);
  --wr-overlay-ease: var(--wr-ease-spring);
}`,

    reduced: `/* ngwr already collapses its own animations under reduced motion —
   you do not need to repeat this for built-in components. Mirror it in
   your own styles so custom motion honours the same preference. */
@media (prefers-reduced-motion: reduce) {
  .my-drawer {
    transition-duration: 0.01ms;
  }
}`,
  };
}
