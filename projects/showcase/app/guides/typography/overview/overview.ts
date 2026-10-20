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
      url: ['/guides/typography', 'styles'] as const,
      title: 'Styles',
      body: 'Every text style and the token behind it.',
    },
    {
      url: ['/guides/typography', 'headings'] as const,
      title: 'Headings & display',
      body: 'Display and h1 to h6.',
    },
    {
      url: ['/guides/typography', 'paragraphs'] as const,
      title: 'Paragraphs',
      body: 'Body text variants, tones, alignment, truncation.',
    },
    {
      url: ['/guides/typography', 'links'] as const,
      title: 'Links',
      body: 'Links inline and with an icon.',
    },
    {
      url: ['/guides/typography', 'lists'] as const,
      title: 'Lists',
      body: 'Bulleted, numbered, nested and description lists.',
    },
    {
      url: ['/guides/typography', 'code'] as const,
      title: 'Code',
      body: 'Inline code and monospace text.',
    },
    {
      url: ['/reference/directives', 'typography'] as const,
      title: 'API reference',
      body: 'Every input, variant and class.',
    },
  ];
}
