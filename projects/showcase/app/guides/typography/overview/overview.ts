import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrTypography } from 'ngwr/typography';

import { DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-typography-overview-page',
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
  imports: [RouterLink, WrTypography, DocPageComponent, DocSectionComponent],
})
export default class TypographyOverviewPage {
  protected readonly cards = [
    {
      url: ['/guides/typography', 'headings'] as const,
      title: 'Headings & display',
      body: 'h1–h6 plus the display variant. Reads the type scale from `--wr-text-*` tokens.',
    },
    {
      url: ['/guides/typography', 'paragraphs'] as const,
      title: 'Paragraphs',
      body: 'lead, body, small, caption, overline. The full prose vocabulary plus tones and alignment.',
    },
    {
      url: ['/guides/typography', 'links'] as const,
      title: 'Links',
      body: 'The `link` variant — inline in a paragraph, or paired with an icon.',
    },
    {
      url: ['/guides/typography', 'lists'] as const,
      title: 'Lists',
      body: 'One `list` variant across ul, ol and dl — markers and nesting follow the element.',
    },
    {
      url: ['/guides/typography', 'code'] as const,
      title: 'Code',
      body: 'Inline code and the `[mono]` modifier for forcing monospace on any variant.',
    },
    {
      // Points OUT of the guide — the API table is maintained in exactly one
      // place. Three of these pages used to carry their own partial copy.
      url: ['/reference/directives', 'typography'] as const,
      title: 'API reference',
      body: 'Every input on `wrTypography`, the full variant union, and the classes it emits.',
    },
  ];
}
