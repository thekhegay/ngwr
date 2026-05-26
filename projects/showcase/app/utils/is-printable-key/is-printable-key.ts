import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-is-printable-key-page',
  templateUrl: './is-printable-key.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
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
      description: 'True when the key is a single printable character with no modifiers. Use for type-to-search and inline-edit flows.',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];
}
