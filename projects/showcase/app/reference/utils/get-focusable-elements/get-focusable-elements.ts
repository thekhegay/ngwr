import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-get-focusable-elements-page',
  templateUrl: './get-focusable-elements.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class GetFocusableElementsPage {
  protected readonly snippet = `import { getFocusableElements } from 'ngwr/utils';

const els = getFocusableElements(menuRef.nativeElement);
els[0]?.focus();   // move focus to the first interactive child`;

  protected readonly whySnippet = `// Native — the obvious one-liner misses several cases.
const els = root.querySelectorAll<HTMLElement>(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
);
// → misses [contenteditable], [area href], media with controls; returns
//   type="hidden" inputs; and keeps elements that are not rendered.

// ngwr — the wider selector plus a rendered-ness filter. Still DOM order:
// neither version sorts by tabindex, and neither should.
const els = getFocusableElements(root);`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'getFocusableElements(root)',
      description:
        'Returns every focusable descendant of `root` in DOM order. Elements that cannot take focus are excluded by the selector; those that are not rendered — no layout box, or `visibility: hidden` — are then filtered out, except the one that currently holds focus.',
      type: '(root: HTMLElement) => readonly HTMLElement[]',
      default: '—',
    },
  ];
}
