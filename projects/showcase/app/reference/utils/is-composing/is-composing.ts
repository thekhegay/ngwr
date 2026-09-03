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
  selector: 'ngwr-utl-is-composing-page',
  templateUrl: './is-composing.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class IsComposingPage {
  protected readonly snippet = `import { isComposing } from 'ngwr/utils';

// The first line of every keydown handler over a field that accepts typed text.
onKeydown(event: KeyboardEvent): void {
  if (isComposing(event)) return;

  switch (event.key) {
    case 'Enter': this.commit(); break;
    case 'Escape': this.close(); break;
  }
}`;

  protected readonly whySnippet = `// Native — the standard flag, and it misses Safari.
if (event.isComposing) return;
// → Safari fires \`compositionend\` BEFORE the keydown of the Enter that accepts
//   a candidate, so that one arrives with isComposing === false and commits the
//   half-composed word anyway.

// ngwr — the flag plus the 229 sentinel every engine sets on an IME's key.
if (isComposing(event)) return;`;

  protected readonly stateSnippet = `// \`isComposing\` answers "did the input method take this KEY". For "is a
// conversion open right now" — which is what an \`input\` or \`blur\` handler needs
// — track the pair instead: on the committing keystroke the two disagree.
@Component({
  host: {
    '(compositionstart)': 'composing = true',
    '(compositionend)': 'composing = false; onSettledInput()',
    '(input)': 'composing ? null : onSettledInput()',
  },
})`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'isComposing(event)',
      description:
        'True while an input method is composing, so the key belongs to the IME rather than to your handler. Return early on it in every keydown handler that reads Enter, Escape or an arrow over a field that accepts typed text.',
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
      title: 'hasModifier',
      url: ['/reference/utils', 'has-modifier'],
      description: 'Skip the browser’s own chords before acting on a key.',
    },
    {
      kind: 'Util',
      title: 'isPrintableKey',
      url: ['/reference/utils', 'is-printable-key'],
      description: 'Single printable characters, for type-to-search buffers.',
    },
  ];
}
