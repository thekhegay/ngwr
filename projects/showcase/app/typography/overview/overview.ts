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
      url: ['/typography', 'headings'] as const,
      title: 'Headings & display',
      body: 'h1–h6 plus the display variant. Reads the type scale from `--wr-text-*` tokens.',
    },
    {
      url: ['/typography', 'text'] as const,
      title: 'Body text',
      body: 'lead, body, small, caption, overline. The full prose vocabulary plus tones and alignment.',
    },
    {
      url: ['/typography', 'code'] as const,
      title: 'Code',
      body: 'Inline code and the `[mono]` modifier for forcing monospace on any variant.',
    },
    {
      url: ['/typography', 'keyboard'] as const,
      title: 'Keyboard caps',
      body: '`<wr-keyboard>` keycaps for documenting shortcuts inside prose.',
    },
  ];
}
