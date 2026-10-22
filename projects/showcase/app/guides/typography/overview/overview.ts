import { Component } from '@angular/core';

import { WrTypography } from 'ngwr/typography';

import { DocPageComponent, DocSectionComponent, DocSeeAlsoComponent, type DocSeeAlsoLink } from '#core/components';

@Component({
  selector: 'ngwr-typography-overview-page',
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
  imports: [WrTypography, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent],
})
export default class TypographyOverviewPage {
  private readonly cards = [
    {
      url: '/guides/typography/styles',
      title: 'Styles',
      body: 'Every text style and the token behind it.',
    },
    {
      url: '/guides/typography/headings',
      title: 'Headings & display',
      body: 'Display and h1 to h6.',
    },
    {
      url: '/guides/typography/paragraphs',
      title: 'Paragraphs',
      body: 'Body text variants, tones, alignment, truncation.',
    },
    {
      url: '/guides/typography/links',
      title: 'Links',
      body: 'Links inline and with an icon.',
    },
    {
      url: '/guides/typography/lists',
      title: 'Lists',
      body: 'Bulleted, numbered, nested and description lists.',
    },
    {
      url: '/guides/typography/code',
      title: 'Code',
      body: 'Inline code and monospace text.',
    },
    {
      url: '/reference/directives/typography',
      title: 'API reference',
      body: 'Every input, variant and class.',
    },
  ];

  protected readonly sections: readonly DocSeeAlsoLink[] = this.cards.map(({ title, url, body }) => ({
    title,
    url: [url],
    description: body,
  }));
}
