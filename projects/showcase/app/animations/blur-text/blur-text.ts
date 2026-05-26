import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrBlurText } from 'ngwr/blur-text';

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
  selector: 'ngwr-blur-text-page',
  templateUrl: './blur-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrBlurText,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class BlurTextPage {
  protected readonly replayKey = signal(0);
  protected replay(): void {
    this.replayKey.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import { WrBlurText } from 'ngwr/blur-text';`,
    basic: `<wr-blur-text text="Welcome to ngwr" />`,
    bottom: `<wr-blur-text
  text="Sliding up from the bottom."
  direction="bottom"
  [delay]="120"
/>`,
    chars: `<wr-blur-text
  text="Every character blurs in"
  animateBy="chars"
  [delay]="40"
  [stepDuration]="0.3"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to animate.', type: 'string', default: '— (required)', required: true },
    { name: 'animateBy', description: 'Split granularity.', type: "'chars' | 'words'", default: "'words'" },
    { name: 'direction', description: "Entry direction: `'top'` slides down into place, `'bottom'` slides up.", type: "'top' | 'bottom'", default: "'top'" },
    { name: 'delay', description: 'Per-piece stagger in ms.', type: 'number', default: '200' },
    { name: 'stepDuration', description: 'Duration of each keyframe step in seconds (total = 2 × stepDuration).', type: 'number', default: '0.35' },
    { name: 'easing', description: 'CSS easing function.', type: 'string', default: "'linear'" },
    { name: 'threshold', description: 'IntersectionObserver threshold (0..1).', type: 'number', default: '0.1' },
    { name: 'rootMargin', description: 'IntersectionObserver rootMargin.', type: 'string', default: "'0px'" },
    { name: '(animationComplete)', description: 'Emitted once all pieces finish animating.', type: 'EventEmitter<void>', default: '—' },
  ];
}
