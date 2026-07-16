import { Component } from '@angular/core';

import { WrTypography } from 'ngwr/typography';

import { DocApiComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';
import type { DocApiRow } from '#core/components';

@Component({
  selector: 'ngwr-directives-typography',
  templateUrl: './typography.html',
  imports: [WrTypography, DocApiComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent],
})
export default class DirectivesTypographyPage {
  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'variant',
      type: 'WrTypographyVariant',
      default: `'body'`,
      description:
        'The text role. Drives size, weight, leading and — for some variants — colour. `code` additionally implies `mono`.',
    },
    {
      name: 'tone',
      type: 'WrTypographyTone | null',
      default: 'null',
      description:
        'Colour override. `null` emits no tone class at all, leaving each variant its own colour — body and headings read `--wr-color-on-surface`, `lead` / `caption` / `overline` are muted, `link` is primary. Set a tone only to depart from that.',
    },
    {
      name: 'align',
      type: 'WrTypographyAlign | null',
      default: 'null',
      description: 'Horizontal alignment. `null` emits no class, so the element inherits alignment from its container.',
    },
    {
      name: 'truncate',
      type: 'boolean',
      default: 'false',
      description:
        'Clip overflow to one line with an ellipsis. Coerced, so the bare attribute works. Forces `display: inline-block` on the host.',
    },
    {
      name: 'mono',
      type: 'boolean',
      default: 'false',
      description:
        'Switch to `--wr-font-family-mono`. Coerced, so the bare attribute works. Implied by `variant="code"`.',
    },
  ];

  protected readonly variants: readonly DocApiRow[] = [
    { name: 'display', type: 'clamp(--wr-text-4xl, 6vw, 3.75rem)', description: 'Hero headline. The only fluid size.' },
    { name: 'h1 … h6', type: '--wr-text-3xl … --wr-text-base', description: 'The heading ladder.' },
    { name: 'lead', type: '--wr-text-lg · muted', description: 'Intro paragraph under a heading.' },
    { name: 'body', type: '--wr-text-base', description: 'Default. Running text.' },
    { name: 'small', type: '--wr-text-sm', description: 'Small print.' },
    { name: 'caption', type: '--wr-text-xs · muted', description: 'Captions, helper text.' },
    { name: 'overline', type: '--wr-text-xs · uppercase · muted', description: 'Section label above a heading.' },
    {
      name: 'code',
      type: 'tinted inline chip · 0.875em',
      description: 'Inline code. Implies `mono`; sized in `em` so it tracks its context.',
    },
    {
      name: 'list',
      type: 'ul / ol / dl aware',
      description: 'Applies to the list element itself; markers and nesting are styled from the element type.',
    },
    { name: 'link', type: 'primary', description: 'Inline link styling.' },
  ];

  protected readonly classes: readonly DocApiRow[] = [
    {
      name: 'wr-typography',
      type: 'always',
      description: 'Base class. Sets margin, font family, and `--wr-color-on-surface`.',
    },
    {
      name: 'wr-typography--{variant}',
      type: 'always',
      description: 'One per variant — always emitted, since `variant` always resolves.',
    },
    {
      name: 'wr-typography--tone-{tone}',
      type: 'when `tone` is set',
      description: 'Omitted entirely when `tone` is `null`.',
    },
    {
      name: 'wr-typography--align-{align}',
      type: 'when `align` is set',
      description: 'Omitted entirely when `align` is `null`.',
    },
    { name: 'wr-typography--truncate', type: 'when `truncate`', description: 'Adds the ellipsis clamp.' },
    {
      name: 'wr-typography--mono',
      type: 'when `mono` or `variant="code"`',
      description: 'The one implicit rule in the directive.',
    },
  ];
}
