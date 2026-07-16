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
  selector: 'ngwr-utl-has-modifier-page',
  templateUrl: './has-modifier.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class HasModifierPage {
  protected readonly snippet = `import { hasModifier } from 'ngwr/utils';

@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  if (hasModifier(e)) return;   // let Ctrl/Cmd-+key shortcuts through
  if (e.key === 'k') focusSearch();
}`;

  protected readonly whySnippet = `// Native — boilerplate, repeats across handlers.
@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if (e.key === 'k') focusSearch();
}

// ngwr — one call, OS-agnostic.
@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  if (hasModifier(e)) return;
  if (e.key === 'k') focusSearch();
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'hasModifier(event)',
      description:
        'True when Ctrl / Cmd / Alt / Shift / Meta is currently held. Use to bypass plain-key shortcuts during chorded shortcuts.',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Keyboard',
      url: ['/guides', 'keyboard'],
      description: 'How chords, keycaps and key primitives fit together in one task.',
    },
    {
      kind: 'Util',
      title: 'isPrintableKey',
      url: ['/reference/utils', 'is-printable-key'],
      description: 'The other half of a type-ahead guard.',
    },
    {
      kind: 'Util',
      title: 'KEYS',
      url: ['/reference/utils', 'keys'],
      description: 'Canonical `KeyboardEvent.key` constants.',
    },
  ];
}
