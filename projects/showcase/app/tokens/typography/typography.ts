import { Component } from '@angular/core';

import { DocApiComponent, DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';
import type { DocApiRow } from '#core/components';

interface ScaleStep {
  readonly token: string;
  readonly value: string;
  readonly px: string;
}

@Component({
  selector: 'ngwr-tokens-typography',
  templateUrl: './typography.html',
  styleUrl: './typography.scss',
  imports: [DocApiComponent, DocCodeComponent, DocPageComponent, DocSectionComponent],
})
export default class TokensTypographyPage {
  /** The `--wr-text-*` font-size scale, in source order (1rem = 16px). */
  protected readonly scale: readonly ScaleStep[] = [
    { token: '--wr-text-xs', value: '0.75rem', px: '12px' },
    { token: '--wr-text-sm', value: '0.875rem', px: '14px' },
    { token: '--wr-text-base', value: '1rem', px: '16px' },
    { token: '--wr-text-lg', value: '1.125rem', px: '18px' },
    { token: '--wr-text-xl', value: '1.25rem', px: '20px' },
    { token: '--wr-text-2xl', value: '1.5rem', px: '24px' },
    { token: '--wr-text-3xl', value: '1.875rem', px: '30px' },
    { token: '--wr-text-4xl', value: '2.25rem', px: '36px' },
    { token: '--wr-text-5xl', value: '3rem', px: '48px' },
  ];

  /** Font-family tokens — system-font fallback chains the library ships by default. */
  protected readonly families: readonly DocApiRow[] = [
    {
      name: '--wr-font-family-base',
      type: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      description: 'Default UI typeface. Apps shipping a custom face override this on `:root` after loading the theme.',
    },
    {
      name: '--wr-font-family-mono',
      type: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      description: 'Monospace face for code, numerics, and tabular data.',
    },
  ];

  /** Font-weight scale. */
  protected readonly weights: readonly DocApiRow[] = [
    { name: '--wr-font-weight-thin', type: '200', description: 'Thin.' },
    { name: '--wr-font-weight-light', type: '300', description: 'Light.' },
    { name: '--wr-font-weight-regular', type: '400', description: 'Regular — body default.' },
    { name: '--wr-font-weight-medium', type: '500', description: 'Medium — labels, emphasis.' },
    { name: '--wr-font-weight-semibold', type: '600', description: 'Semibold — subheadings.' },
    { name: '--wr-font-weight-bold', type: '700', description: 'Bold — headings.' },
    { name: '--wr-font-weight-extrabold', type: '800', description: 'Extrabold — display.' },
  ];

  /** Line-height (leading) scale — unitless multipliers. */
  protected readonly leading: readonly DocApiRow[] = [
    { name: '--wr-leading-none', type: '1', description: 'No leading — tight display headings.' },
    { name: '--wr-leading-tight', type: '1.25', description: 'Tight.' },
    { name: '--wr-leading-snug', type: '1.375', description: 'Snug.' },
    { name: '--wr-leading-normal', type: '1.5', description: 'Normal — body default.' },
    { name: '--wr-leading-relaxed', type: '1.625', description: 'Relaxed.' },
    { name: '--wr-leading-loose', type: '2', description: 'Loose.' },
  ];

  /** Letter-spacing (tracking) scale — em-relative offsets. */
  protected readonly tracking: readonly DocApiRow[] = [
    { name: '--wr-tracking-tighter', type: '-0.05em', description: 'Tighter — large display text.' },
    { name: '--wr-tracking-tight', type: '-0.025em', description: 'Tight — headings.' },
    { name: '--wr-tracking-normal', type: '0', description: 'Normal — body default.' },
    { name: '--wr-tracking-wide', type: '0.025em', description: 'Wide.' },
    { name: '--wr-tracking-wider', type: '0.05em', description: 'Wider.' },
    { name: '--wr-tracking-widest', type: '0.1em', description: 'Widest — uppercase eyebrows, badges.' },
  ];

  protected readonly snippets = {
    usage: `.card-caption {
  font-family: var(--wr-font-family-base);
  font-size: var(--wr-text-sm); /* 14px */
  font-weight: var(--wr-font-weight-medium);
  line-height: var(--wr-leading-normal);
  letter-spacing: var(--wr-tracking-normal);
}

.code-inline {
  font-family: var(--wr-font-family-mono);
  font-size: var(--wr-text-xs); /* 12px */
}`,

    override: `/* Ship your own typeface — override the family tokens on :root
   after loading the theme; every component re-reads them. */
:root {
  --wr-font-family-base: 'Inter', system-ui, sans-serif;
  --wr-font-family-mono: 'JetBrains Mono', ui-monospace, monospace;
}`,
  };
}
