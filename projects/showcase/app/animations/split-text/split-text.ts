import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrSplitText } from 'ngwr/split-text';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-split-text-page',
  templateUrl: './split-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrSplitText, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class SplitTextPage {
  /** Replayable key — bump it to remount and re-trigger the animation. */
  protected readonly replayKey = signal(0);

  protected replay(): void {
    this.replayKey.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import { WrSplitText } from 'ngwr/split-text';`,
    basic: `<wr-split-text
  text="Hello, ngwr!"
  [delay]="40"
  [duration]="1.2"
/>`,
    words: `<wr-split-text
  text="Animate every word with a slide-and-fade."
  splitType="words"
  [delay]="80"
  [from]="{ opacity: 0, y: 30 }"
  [to]="{ opacity: 1, y: 0 }"
/>`,
    scale: `<wr-split-text
  text="Scale + rotate in"
  [from]="{ opacity: 0, scale: 0.4, rotate: -15 }"
  [to]="{ opacity: 1, scale: 1, rotate: 0 }"
  [duration]="0.9"
  [delay]="30"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to animate.', type: 'string', default: '— (required)', required: true },
    { name: 'splitType', description: 'Split granularity.', type: "'chars' | 'words'", default: "'chars'" },
    { name: 'delay', description: 'Stagger delay between pieces in ms.', type: 'number', default: '50' },
    { name: 'duration', description: 'Animation duration in seconds.', type: 'number', default: '1.25' },
    { name: 'easing', description: 'CSS easing function.', type: 'string', default: "'cubic-bezier(0.16, 1, 0.3, 1)' (~power3.out)" },
    { name: 'from', description: 'Start state for each piece. Properties: `opacity`, `x`, `y` (px), `scale`, `rotate` (deg).', type: 'WrSplitTextMotion', default: '{ opacity: 0, y: 40 }' },
    { name: 'to', description: 'End state for each piece. Same shape as `from`.', type: 'WrSplitTextMotion', default: '{ opacity: 1, y: 0 }' },
    { name: 'threshold', description: 'IntersectionObserver threshold (0..1).', type: 'number', default: '0.1' },
    { name: 'rootMargin', description: 'IntersectionObserver rootMargin.', type: 'string', default: "'-100px'" },
    { name: 'textAlign', description: 'Text alignment on the host.', type: "'left' | 'center' | 'right' | 'justify'", default: "'center'" },
    { name: '(animationComplete)', description: 'Emitted once all pieces finish animating.', type: 'EventEmitter<void>', default: '—' },
  ];
}
