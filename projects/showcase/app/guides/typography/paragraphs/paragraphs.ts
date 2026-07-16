import { Component } from '@angular/core';

import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-typography-text-page',
  templateUrl: './paragraphs.html',
  imports: [WrTypography, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class TypographyTextPage {
  protected readonly snippets = {
    defaultP: `<p wrTypography variant="body">…</p>`,
    leadP: `<p wrTypography variant="lead">…</p>`,
    variants: `<p wrTypography variant="lead">Lead paragraph — calmer subhead under a headline.</p>
<p wrTypography>Body copy in the default variant.</p>
<p wrTypography variant="small">Small print.</p>
<p wrTypography variant="caption">Captions and helper text.</p>
<p wrTypography variant="overline">Section label</p>`,
    tones: `<!-- No tone at all is the default: each variant keeps its own colour. -->
<p wrTypography>Body, untoned</p>

<p wrTypography tone="dark">Dark</p>
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
}
