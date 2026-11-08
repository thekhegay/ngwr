import { Component, inject } from '@angular/core';

import { WrConfetti } from 'ngwr/animations/confetti';
import { WrButton } from 'ngwr/button';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-confetti-page',
  templateUrl: './confetti.html',
  imports: [WrButton, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class ConfettiPageComponent {
  private readonly confetti = inject(WrConfetti);

  protected burst(event: Event, count?: number): void {
    const from = event.currentTarget as Element;
    this.confetti.burst(from, count === undefined ? {} : { count });
  }

  protected readonly snippets = {
    usage: `private readonly confetti = inject(WrConfetti);

protected celebrate(button: HTMLElement): void {
  this.confetti.burst(button);
}`,
    options: `this.confetti.burst(button, { count: 160 });
// The same seed gives the same burst, which a spec can pin.
this.confetti.burst({ left: 0, top: 0, width: innerWidth, height: 0 }, { seed: 7 });`,
    colours: `.wr-confetti {
  --wr-confetti-color-1: var(--wr-color-primary);
  --wr-confetti-color-2: var(--wr-color-success);
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'burst(from, options?)',
      description:
        'Throws a burst up from `from`: an element, whose client rect is read now, or a rect in client coordinates. Pieces start anywhere inside the rect, so a wide block showers along its width and a button bursts from a point.',
      type: '(from: Element | WrConfettiRect, options?: WrConfettiOptions) => void',
    },
    {
      name: 'clear()',
      description: 'Stops the loop and takes the canvas and every piece out. Idempotent.',
      type: '() => void',
    },
    {
      name: 'active',
      description: 'Whether pieces are in the air.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'options.count',
      description: 'Pieces in the burst.',
      type: 'number',
      default: '84',
    },
    {
      name: 'options.seed',
      description: 'Seeds the layout, so the same seed gives the same burst.',
      type: 'number',
      default: 'random',
    },
  ];
}
