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
  selector: 'ngwr-utl-is-printable-key-page',
  templateUrl: './is-printable-key.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class IsPrintableKeyPage {
  protected readonly snippet = `import { isPrintableKey } from 'ngwr/utils';

// Type-to-search: only consume printable keys, ignore arrows/Enter/etc.
@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  if (isPrintableKey(e)) buffer.push(e.key);
}`;

  protected readonly whySnippet = `// Native — "length === 1" looks right but matches modifier chords.
if (e.key.length === 1) buffer.push(e.key);
// → Ctrl+A: e.key is 'a' (length 1), so this pushes 'a'. Bug.

// ngwr — excludes chorded keys explicitly.
if (isPrintableKey(e)) buffer.push(e.key);`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'isPrintableKey(event)',
      description:
        'True when the key is a single printable character with no modifiers. Use for type-to-search and inline-edit flows.',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Keyboard',
      url: ['/getting-started', 'keyboard'],
      description: 'How chords, keycaps and key primitives fit together in one task.',
    },
    {
      kind: 'Util',
      title: 'hasModifier',
      url: ['/utils', 'has-modifier'],
      description: 'Skip the browser’s own chords before testing for a character.',
    },
    {
      kind: 'Util',
      title: 'KEYS',
      url: ['/utils', 'keys'],
      description: 'Canonical `KeyboardEvent.key` constants.',
    },
  ];
}
