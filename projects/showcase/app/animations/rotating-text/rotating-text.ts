import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';

import { WrRotatingText } from 'ngwr/rotating-text';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  ReactbitsCredit,
} from '#core/components';

@Component({
  selector: 'ngwr-rotating-text-page',
  templateUrl: './rotating-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrRotatingText,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class RotatingTextPage {
  @ViewChild('manual') protected manual?: WrRotatingText;

  protected next(): void {
    this.manual?.next();
  }
  protected previous(): void {
    this.manual?.previous();
  }
  protected reset(): void {
    this.manual?.reset();
  }

  protected readonly snippets = {
    install: `import { WrRotatingText } from 'ngwr/rotating-text';`,
    basic: `<wr-rotating-text [texts]="['design', 'ship', 'iterate']" />`,
    stagger: `<wr-rotating-text
  [texts]="['React', 'Vue', 'Angular', 'Svelte']"
  [rotationInterval]="2500"
  [staggerDuration]="0.04"
  staggerFrom="center"
/>`,
    manual: `<wr-rotating-text
  #rotator
  [texts]="['one', 'two', 'three']"
  [auto]="false"
/>
<button (click)="rotator.next()">Next</button>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'texts', description: 'Strings to cycle.', type: 'readonly string[]', default: '— (required)', required: true },
    { name: 'rotationInterval', description: 'Auto-advance interval in ms.', type: 'number', default: '2000' },
    { name: 'splitBy', description: 'Granularity of the split.', type: "'characters' | 'words' | 'lines'", default: "'characters'" },
    { name: 'auto', description: 'Auto-advance on a timer.', type: 'boolean', default: 'true' },
    { name: 'loop', description: 'Loop back to the first string after the last.', type: 'boolean', default: 'true' },
    { name: 'staggerDuration', description: 'Per-piece stagger in seconds.', type: 'number', default: '0' },
    { name: 'staggerFrom', description: 'Stagger origin.', type: "'first' | 'last' | 'center'", default: "'first'" },
    { name: '(nextChange)', description: 'Emits with the new index on every rotation.', type: 'EventEmitter<number>', default: '—' },
    { name: 'next() / previous() / jumpTo(i) / reset()', description: 'Imperative methods on the component instance.', type: 'method', default: '—' },
  ];
}
