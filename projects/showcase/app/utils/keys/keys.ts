import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-keys-page',
  templateUrl: './keys.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class KeysPage {
  protected readonly snippet = `import { KEYS, type WrKey } from 'ngwr/utils';

if (event.key === KEYS.ESCAPE) {
  close();
}

function onArrow(key: WrKey) { /* strictly-typed */ }`;

  protected readonly whySnippet = `// Native — string literals are typo-prone and the spec is surprising.
if (event.key === 'Esacpe') close();   // typo → silently never fires
if (event.key === 'Up') {} //          ← wrong, it's 'ArrowUp'
if (event.key === 'Space') {} //       ← wrong, it's ' ' (a literal space)

// ngwr — autocomplete + spec-correct + WrKey union for type-safe matching.
if (event.key === KEYS.ESCAPE) close();
if (event.key === KEYS.ARROW_UP) prev();
if (event.key === KEYS.SPACE) toggle();`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'KEYS',
      description:
        'Canonical `KeyboardEvent.key` constants — `ENTER`, `ESCAPE`, `ARROW_UP`, `ARROW_DOWN`, `TAB`, `SPACE`, …',
      type: 'const record',
      default: '—',
    },
    {
      name: 'WrKey',
      description: 'Union of every value in `KEYS` — drop into function signatures for type-safe key matching.',
      type: 'type',
      default: '—',
    },
  ];
}
