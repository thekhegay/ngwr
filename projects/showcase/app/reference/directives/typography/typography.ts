import { Component } from '@angular/core';

import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  DocSnippetComponent,
} from '#core/components';
import type { DocApiRow, DocSeeAlsoLink } from '#core/components';

@Component({
  selector: 'ngwr-directives-typography',
  templateUrl: './typography.html',
  imports: [
    WrTypography,
    DocApiComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocSeeAlsoComponent,
  ],
})
export default class DirectivesTypographyPage {
  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'variant',
      type: 'WrTypographyVariant',
      default: `'body'`,
      description: 'The text role: size, weight, leading and, for some variants, colour.',
    },
    {
      name: 'tone',
      type: 'WrTypographyTone | null',
      default: 'null',
      description: 'Colour override. `null` keeps the variant colour; `base` turns a muted variant to the page ink.',
    },
    {
      name: 'align',
      type: 'WrTypographyAlign | null',
      default: 'null',
      description: 'Text alignment. `null` inherits it.',
    },
    {
      name: 'truncate',
      type: 'boolean',
      default: 'false',
      description: 'One line with an ellipsis. Sets `display: inline-block`.',
    },
    {
      name: 'mono',
      type: 'boolean',
      default: 'false',
      description: 'Monospace font. On by default for `variant="code"`.',
    },
  ];

  protected readonly variants: readonly DocApiRow[] = [
    { name: 'display', type: 'clamp(--wr-text-4xl, 6vw, 3.75rem)', description: 'Hero headline. The only fluid size.' },
    { name: 'h1 … h6', type: '--wr-text-5xl … --wr-text-lg', description: 'The heading ladder.' },
    { name: 'lead', type: '--wr-text-xl · muted', description: 'Intro paragraph under a heading.' },
    { name: 'body', type: '--wr-text-base', description: 'Default. Running text.' },
    { name: 'small', type: '--wr-text-sm', description: 'Small print.' },
    { name: 'caption', type: '--wr-text-xs · muted', description: 'Captions, helper text.' },
    { name: 'overline', type: '--wr-text-xs · uppercase · muted', description: 'Section label above a heading.' },
    {
      name: 'code',
      type: 'tinted inline chip · 0.875em',
      description: 'Inline code. Implies `mono`.',
    },
    {
      name: 'list',
      type: 'ul / ol / dl aware · muted',
      description: 'Put it on the `ul`, `ol` or `dl` itself.',
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
      description: 'One per variant.',
    },
    {
      name: 'wr-typography--tone-{tone}',
      type: 'when `tone` is set',
      description: 'Absent when `tone` is `null`.',
    },
    {
      name: 'wr-typography--align-{align}',
      type: 'when `align` is set',
      description: 'Absent when `align` is `null`.',
    },
    { name: 'wr-typography--truncate', type: 'when `truncate`', description: 'Adds the ellipsis clamp.' },
    {
      name: 'wr-typography--mono',
      type: 'when `mono` or `variant="code"`',
      description: 'Monospace font.',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Typography guide',
      url: ['/guides/typography', 'overview'],
      description: 'The variants in use.',
    },
    {
      kind: 'Guide',
      title: 'Typography tokens',
      url: ['/guides/tokens', 'typography'],
      description: 'The --wr-text-* scale.',
    },
    {
      kind: 'Guide',
      title: 'Theming',
      url: ['/guides', 'theming'],
      description: 'Change the tokens.',
    },
  ];
}
