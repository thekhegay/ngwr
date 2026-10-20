import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent } from '#core/components';
import type { DocSeeAlsoLink } from '#core/components';

interface Token {
  readonly name: string;
  readonly value: string;
  readonly use?: string;
}

@Component({
  selector: 'ngwr-tokens-motion',
  templateUrl: './motion.html',
  styleUrl: './motion.scss',
  imports: [DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent],
})
export default class TokensMotionPage {
  protected readonly easings: readonly Token[] = [
    { name: '--wr-ease-linear', value: 'linear', use: 'Progress bars, spinners, marquees' },
    { name: '--wr-ease-out', value: 'cubic-bezier(0.16, 1, 0.3, 1)', use: 'Entering' },
    { name: '--wr-ease-in', value: 'cubic-bezier(0.7, 0, 0.84, 0)', use: 'Leaving' },
    { name: '--wr-ease-in-out', value: 'cubic-bezier(0.65, 0, 0.35, 1)', use: 'Moving between two states' },
    { name: '--wr-ease-spring', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', use: 'Overshoot. Use sparingly' },
  ];

  protected readonly durations: readonly Token[] = [
    { name: '--wr-duration-fast', value: '0.1s', use: 'Hover and focus feedback' },
    { name: '--wr-duration-base', value: '0.15s', use: 'State changes: pressed, checked, selected' },
    { name: '--wr-duration-slow', value: '0.3s', use: 'Travel: a drawer, an expanding panel' },
    { name: '--wr-duration-slower', value: '0.5s', use: 'Full-screen motion' },
  ];

  protected readonly shorthands: readonly Token[] = [
    { name: '--wr-transition-short', value: 'var(--wr-duration-fast) var(--wr-ease-out)' },
    { name: '--wr-transition-base', value: 'var(--wr-duration-base) var(--wr-ease-linear)' },
    { name: '--wr-transition-long', value: 'var(--wr-duration-slow) var(--wr-ease-out)' },
  ];

  protected readonly overlayTokens: readonly Token[] = [
    { name: '--wr-overlay-duration', value: 'var(--wr-duration-base)' },
    { name: '--wr-overlay-ease', value: 'var(--wr-ease-out)' },
  ];

  protected readonly snippets = {
    usage: `.my-control {
  transition: background-color var(--wr-transition-base);
}

.my-drawer {
  transition: transform var(--wr-duration-slow) var(--wr-ease-out);
}

// Retune everything that reads the tokens
:root {
  --wr-duration-base: 0.08s;
  --wr-overlay-ease: var(--wr-ease-spring);
}`,

    reduced: `@media (prefers-reduced-motion: reduce) {
  :root {
    --wr-duration-fast: 0.01ms;
    --wr-duration-base: 0.01ms;
    --wr-duration-slow: 0.01ms;
    --wr-duration-slower: 0.01ms;
    --wr-overlay-duration: 0.01ms;
  }
}`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Theming', url: ['/guides', 'theming'] },
    { kind: 'Animation', title: 'Animations', url: ['/bits'] },
  ];
}
