import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-typeahead-page',
  templateUrl: './wr-typeahead.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class WrTypeaheadPage {
  protected readonly snippet = `import { wrTypeahead } from 'ngwr/utils';

@Component({
  host: { '(keydown)': 'onKeydown($event)' },
})
export class Menu {
  readonly labels = input.required<readonly string[]>();
  protected readonly cursor = signal(0);
  private readonly typeahead = wrTypeahead();

  protected onKeydown(event: KeyboardEvent): void {
    const index = this.typeahead.handleKey(event, this.labels(), this.cursor());
    if (index === null) return this.onOtherKey(event);
    event.preventDefault();
    if (index >= 0) this.cursor.set(index);
  }
}`;

  protected readonly itemsSnippet = `const locale = inject(WR_LIVE_LOCALE, { optional: true });
const typeahead = wrTypeahead({ resetMs: 700, locale: () => locale?.() });

typeahead.handleKey(event, [
  { label: 'Copy' },
  { label: 'Copy link', disabled: true },
  { label: 'Cut' },
], current);`;

  protected readonly splitSnippet = `if (typeahead.type(event)) {
  event.preventDefault();
  open();
  afterNextRender(() => {
    const index = typeahead.find(labels(), cursor());
    if (index >= 0) cursor.set(index);
  }, { injector });
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrTypeahead(options?)',
      description: 'Returns a `WrTypeahead`. One per list: it holds the run.',
      type: '(options?: WrTypeaheadOptions) => WrTypeahead',
      default: '—',
    },
    {
      name: 'options.resetMs',
      description: 'The pause, in milliseconds, after which the next key starts a new run.',
      type: 'number',
      default: '500',
    },
    {
      name: 'options.locale',
      description: 'The language the labels are in, for the case folding. The browser locale when omitted.',
      type: 'string | (() => string | undefined)',
      default: '—',
    },
    {
      name: 'handleKey(event, items, current)',
      description:
        'Takes a `keydown` and answers the index to move to, `-1` when the key joined the run and nothing matches, or `null` when the key is not a typeahead key.',
      type: '(event: KeyboardEvent, items: readonly (string | WrTypeaheadItem)[], current: number) => number | null',
      default: '—',
    },
    {
      name: 'type(event)',
      description: 'Adds a `keydown` to the run. Returns whether the key was taken.',
      type: '(event: KeyboardEvent) => boolean',
      default: '—',
    },
    {
      name: 'find(items, current)',
      description: 'The index the run points at, or `-1`.',
      type: '(items: readonly (string | WrTypeaheadItem)[], current: number) => number',
      default: '—',
    },
    {
      name: 'active',
      description: 'Whether a run is in progress.',
      type: 'boolean',
      default: '—',
    },
    {
      name: 'reset()',
      description: 'Drops the run.',
      type: '() => void',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Keyboard', url: ['/guides', 'keyboard'] },
    { kind: 'Util', title: 'wrIsPrintableKey', url: ['/reference/utils', 'wr-is-printable-key'] },
    { kind: 'Util', title: 'wrIsComposing', url: ['/reference/utils', 'wr-is-composing'] },
  ];
}
