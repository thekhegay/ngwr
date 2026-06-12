import { Component } from '@angular/core';

import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-typography-text-page',
  templateUrl: './text.html',
  imports: [
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TypographyTextPage {
  protected readonly snippets = {
    variants: `<p wrTypography variant="lead">Lead paragraph — calmer subhead under a headline.</p>
<p wrTypography>Body copy in the default variant.</p>
<p wrTypography variant="small">Small print.</p>
<p wrTypography variant="caption">Captions and helper text.</p>
<p wrTypography variant="overline">Section label</p>`,
    tones: `<p wrTypography tone="dark">Dark (default)</p>
<p wrTypography tone="medium">Muted</p>
<p wrTypography tone="primary">Primary</p>
<p wrTypography tone="success">Success</p>
<p wrTypography tone="warning">Warning</p>
<p wrTypography tone="danger">Danger</p>`,
    align: `<p wrTypography align="start">Start (default)</p>
<p wrTypography align="center">Centered</p>
<p wrTypography align="end">End</p>
<p wrTypography align="justify">Justified text fills the line width.</p>`,
    truncate: `<p wrTypography [truncate]="true" style="max-width: 18rem">
  A long line that gets ellipsized when it overflows the container.
</p>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'variant',
      type: `'lead' | 'body' | 'small' | 'caption' | 'overline'`,
      default: `'body'`,
      description: 'Running-text variants.',
    },
    {
      name: 'tone',
      type: `'dark' | 'medium' | 'primary' | 'success' | 'warning' | 'danger'`,
      default: `'dark'`,
      description: 'Color tone, mapped to a `--wr-color-*` token.',
    },
    {
      name: 'align',
      type: `'start' | 'center' | 'end' | 'justify' | null`,
      default: 'null',
      description: 'Horizontal alignment.',
    },
    { name: 'truncate', type: 'boolean', default: 'false', description: 'Single-line ellipsis on overflow.' },
  ];
}
