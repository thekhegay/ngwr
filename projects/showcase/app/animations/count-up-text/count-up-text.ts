import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrCountUpText } from 'ngwr/count-up-text';

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
  selector: 'ngwr-count-up-text-page',
  templateUrl: './count-up-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrCountUpText,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class CountUpTextPage {
  protected readonly replayKey = signal(0);
  protected replay(): void {
    this.replayKey.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import { WrCountUpText } from 'ngwr/count-up-text';`,
    basic: `<wr-count-up-text [to]="2025" />`,
    grouped: `<wr-count-up-text [to]="1234567" separator="," />`,
    decimals: `<wr-count-up-text [from]="0" [to]="99.99" [duration]="2.5" />`,
    down: `<wr-count-up-text [from]="0" [to]="100" direction="down" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'to', description: 'Target value.', type: 'number', default: '— (required)', required: true },
    { name: 'from', description: 'Starting value.', type: 'number', default: '0' },
    { name: 'direction', description: "Direction of count. `'down'` swaps the start/end pair.", type: "'up' | 'down'", default: "'up'" },
    { name: 'delay', description: 'Delay before starting in seconds.', type: 'number', default: '0' },
    { name: 'duration', description: 'Approximate animation duration in seconds (tunes the spring).', type: 'number', default: '2' },
    { name: 'separator', description: 'Thousands separator. Empty string disables grouping.', type: 'string', default: "''" },
    { name: 'startWhen', description: 'Start the animation only when `true`.', type: 'boolean', default: 'true' },
    { name: '(started)', description: 'Emits when the animation begins.', type: 'EventEmitter<void>', default: '—' },
    { name: '(ended)', description: 'Emits when the animation settles.', type: 'EventEmitter<void>', default: '—' },
  ];
}
