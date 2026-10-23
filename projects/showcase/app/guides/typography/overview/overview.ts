import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrTypography, type WrTypographyTone, type WrTypographyVariant } from 'ngwr/typography';

import {
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';
import { ROUTES, wrPath } from '#routes';

/**
 * Which strip of the specimen each variant sits in, in scale order. A `Record`
 * over the union, so a variant added to the library cannot ship without a
 * place on this page.
 *
 * The specimen prints each variant's own name rather than a sample sentence:
 * the sentences, the tokens and the measured sizes are the Styles page's, and
 * a second copy of them here would drift from the first.
 */
const VARIANT_STRIPS = {
  display: 'heading',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  lead: 'text',
  body: 'text',
  small: 'text',
  caption: 'text',
  overline: 'text',
  code: 'text',
  link: 'text',
  list: 'text',
} satisfies Record<WrTypographyVariant, 'heading' | 'text'>;

/** Every tone, in the order the type declares them. A `Record` for the same reason. */
const TONES = {
  base: true,
  muted: true,
  primary: true,
  success: true,
  warning: true,
  danger: true,
} satisfies Record<WrTypographyTone, true>;

const variantsIn = (strip: 'heading' | 'text'): readonly WrTypographyVariant[] =>
  (Object.keys(VARIANT_STRIPS) as WrTypographyVariant[]).filter(v => VARIANT_STRIPS[v] === strip);

@Component({
  selector: 'ngwr-typography-overview-page',
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
  imports: [RouterLink, WrTypography, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent, DocSnippetComponent],
})
export default class TypographyOverviewPage {
  protected readonly headings = variantsIn('heading');
  protected readonly text = variantsIn('text');
  protected readonly tones = Object.keys(TONES) as readonly WrTypographyTone[];

  /** Where the `link` word goes: the guide that covers the variant. */
  protected readonly linksPage = wrPath(ROUTES.guides, ROUTES.guides.typography, ROUTES.guides.typography.links);

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
