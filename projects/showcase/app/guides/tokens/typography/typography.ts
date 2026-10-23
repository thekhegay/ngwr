import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent } from '#core/components';
import type { DocSeeAlsoLink } from '#core/components';

interface ScaleStep {
  readonly token: string;
  readonly value: string;
  readonly px: string;
  readonly leading: string;
}

@Component({
  selector: 'ngwr-tokens-typography',
  templateUrl: './typography.html',
  styleUrl: './typography.scss',
  imports: [DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent],
})
export default class TokensTypographyPage {
  /** The `--wr-text-*` font-size scale with its `-leading` pair, in source order (1rem = 16px). */
  protected readonly scale: readonly ScaleStep[] = [
    { token: '--wr-text-xs', value: '0.75rem', px: '12px', leading: '1rem' },
    { token: '--wr-text-sm', value: '0.875rem', px: '14px', leading: '1.25rem' },
    { token: '--wr-text-base', value: '1rem', px: '16px', leading: '1.5rem' },
    { token: '--wr-text-lg', value: '1.125rem', px: '18px', leading: '1.75rem' },
    { token: '--wr-text-xl', value: '1.25rem', px: '20px', leading: '1.75rem' },
    { token: '--wr-text-2xl', value: '1.5rem', px: '24px', leading: '2rem' },
    { token: '--wr-text-3xl', value: '1.875rem', px: '30px', leading: '2.25rem' },
    { token: '--wr-text-4xl', value: '2.25rem', px: '36px', leading: '2.5rem' },
    { token: '--wr-text-5xl', value: '3rem', px: '48px', leading: '1' },
  ];

  protected readonly snippets = {
    usage: `.card-caption {
  font-size: var(--wr-text-sm);
  font-weight: var(--wr-font-weight-medium);
  line-height: var(--wr-leading-normal);
  letter-spacing: var(--wr-tracking-normal);
}

.code-inline {
  font-family: var(--wr-font-family-mono);
  font-size: var(--wr-text-xs);
}`,

    override: `:root {
  --wr-font-family-base: 'Inter', system-ui, sans-serif;
  --wr-font-family-mono: 'JetBrains Mono', ui-monospace, monospace;
}`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Typography', url: ['/guides/typography', 'overview'] },
  ];
}
