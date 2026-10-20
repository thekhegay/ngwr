import { Component } from '@angular/core';

import { WrTypography } from 'ngwr/typography';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-typography-text-page',
  templateUrl: './paragraphs.html',
  imports: [
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocSeeAlsoComponent,
  ],
})
export default class TypographyTextPage {
  protected readonly snippets = {
    variants: `<p wrTypography variant="lead">Lead paragraph — calmer subhead under a headline.</p>
<p wrTypography>Body copy in the default variant.</p>
<p wrTypography variant="small">Small print.</p>
<p wrTypography variant="caption">Captions and helper text.</p>
<p wrTypography variant="overline">Section label</p>`,
    tones: `<p wrTypography>Body, untoned</p>
<p wrTypography tone="base">Base</p>
<p wrTypography tone="muted">Muted</p>
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

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Directive',
      title: '[wrTypography]',
      url: ['/reference/directives', 'typography'],
    },
  ];
}
