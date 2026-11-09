import { Component } from '@angular/core';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

interface Token {
  readonly name: string;
  readonly value: string;
  readonly use: string;
}

interface Limit {
  readonly where: string;
  readonly what: string;
}

@Component({
  selector: 'ngwr-gs-scrollbar-page',
  templateUrl: './scrollbar.html',
  imports: [DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class ScrollbarGuidePageComponent {
  protected readonly rows = Array.from({ length: 24 }, (_, i) => `Row ${i + 1}`);

  protected readonly snippets = {
    page: `// styles.scss
@use 'ngwr/theme' as wr;

@include wr.scrollbar;`,

    block: `@use 'ngwr/theme' as wr;

.panel {
  max-height: 20rem;
  overflow: auto;

  @include wr.scrollbar;
}`,

    scheme: `:root {
  --wr-scrollbar-thumb: light-dark(rgb(0 0 0 / 25%), rgb(255 255 255 / 30%));
  --wr-scrollbar-thumb-hover: light-dark(rgb(0 0 0 / 45%), rgb(255 255 255 / 50%));
}`,
  };

  protected readonly tokens: readonly Token[] = [
    { name: '--wr-scrollbar-size', value: '0.625rem', use: 'Width of a vertical bar, height of a horizontal one' },
    {
      name: '--wr-scrollbar-thumb',
      value: 'color-mix(in srgb, var(--wr-color-on-surface) 20%, transparent)',
      use: 'The thumb at rest',
    },
    {
      name: '--wr-scrollbar-thumb-hover',
      value: 'color-mix(in srgb, var(--wr-color-on-surface) 35%, transparent)',
      use: 'The thumb under the pointer',
    },
  ];

  protected readonly limits: readonly Limit[] = [
    { where: 'Firefox', what: 'Draws its own thin scrollbar in the thumb colour. No exact width.' },
    {
      where: 'macOS overlay scrollbars',
      what: 'Show only while scrolling, unless the system setting is "Always".',
    },
    { where: 'Forced colors', what: 'Keep the system scrollbar.' },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Theming', url: ['/guides', 'theming'] },
    { kind: 'Guide', title: 'Sizing', url: ['/guides/tokens', 'sizing'] },
  ];
}
