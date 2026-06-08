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
  selector: 'ngwr-typography-headings-page',
  templateUrl: './headings.html',
  imports: [WrTypography, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class TypographyHeadingsPage {
  protected readonly snippets = {
    scale: `<h1 wrTypography variant="display">Display</h1>
<h1 wrTypography variant="h1">Heading 1</h1>
<h2 wrTypography variant="h2">Heading 2</h2>
<h3 wrTypography variant="h3">Heading 3</h3>
<h4 wrTypography variant="h4">Heading 4</h4>
<h5 wrTypography variant="h5">Heading 5</h5>
<h6 wrTypography variant="h6">Heading 6</h6>`,
    pair: `<p wrTypography variant="overline" tone="primary">Pricing</p>
<h1 wrTypography variant="display">Built for every scale</h1>
<p wrTypography variant="lead" tone="medium">
  Start on the free tier and grow into a self-hosted seat the moment you outgrow it.
</p>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'variant',
      type: `'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'`,
      default: '—',
      description: 'Heading-scale variant. `display` is the oversized hero size; h1–h6 follow the standard semantic ladder.',
    },
    { name: 'tone', type: 'WrTypographyTone', default: "'dark'", description: 'Color tone.' },
    { name: 'align', type: 'WrTypographyAlign | null', default: 'null', description: 'Horizontal alignment.' },
  ];
}
