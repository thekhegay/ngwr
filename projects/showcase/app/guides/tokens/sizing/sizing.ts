import { Component } from '@angular/core';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

interface Token {
  readonly name: string;
  readonly value: string;
  readonly use?: string;
}

@Component({
  selector: 'ngwr-tokens-sizing',
  templateUrl: './sizing.html',
  imports: [DocCodeComponent, DocPageComponent, DocSectionComponent, DocSeeAlsoComponent],
})
export default class TokensSizingPage {
  protected readonly sizes = [
    { name: 'sm', height: '22px' },
    { name: 'md', height: '30px' },
    { name: 'lg', height: '36px' },
  ] as const;

  protected readonly controlTokens: readonly Token[] = [
    { name: '--wr-control-padding-y-{size}', value: '2px / 4px / 5px' },
    { name: '--wr-control-padding-x-{size}', value: '8px / 12px / 16px' },
    { name: '--wr-control-line-height-{size}', value: '16px / 20px / 24px' },
    { name: '--wr-control-font-size-{size}', value: '12px / 14px / 16px' },
    { name: '--wr-control-radius-{size}', value: '5px / 6px / 7px' },
  ];

  protected readonly spaceTokens: readonly Token[] = [
    { name: '--wr-space-xs', value: '0.25rem' },
    { name: '--wr-space-sm', value: '0.5rem' },
    { name: '--wr-space-md', value: '0.75rem' },
    { name: '--wr-space-lg', value: '1rem' },
    { name: '--wr-space-xl', value: '1.5rem' },
  ];

  protected readonly radiusTokens: readonly Token[] = [
    { name: '--wr-border-radius-sm', value: '0.375rem', use: 'Rows inside a panel' },
    { name: '--wr-border-radius-base', value: '0.625rem', use: 'Cards, dropdowns, dialogs, toasts' },
    { name: '--wr-border-radius-lg', value: '1rem', use: 'Large surfaces' },
    { name: '--wr-border-radius-pill', value: '50rem', use: 'Pill ends: tags, pill buttons' },
  ];

  protected readonly snippets = {
    size: `<button wr-btn type="button" size="sm">Small</button>
<input wrInput size="md" />
<wr-select size="lg">…</wr-select>`,

    usage: `.my-control {
  padding: calc(var(--wr-control-padding-y-md) * var(--wr-density-y, 1))
    calc(var(--wr-control-padding-x-md) * var(--wr-density-x, 1));
  line-height: var(--wr-control-line-height-md);
  font-size: var(--wr-control-font-size-md);
  border: 1px solid var(--wr-border-base);
  border-radius: var(--wr-control-radius-md);
}`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Density', url: ['/guides/tokens', 'density'] },
    { kind: 'Guide', title: 'Theming', url: ['/guides', 'theming'] },
  ];
}
