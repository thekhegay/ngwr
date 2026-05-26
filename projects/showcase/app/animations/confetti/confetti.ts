import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { WrConfetti } from 'ngwr/confetti';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class ConfettiPage {
  protected readonly confetti = inject(WrConfetti);

  protected fire(): void {
    this.confetti.fire();
  }

  protected readonly snippets = {
    install: `import { WrConfetti } from 'ngwr/confetti';`,
    basic: `private readonly confetti = inject(WrConfetti);

onWin(): void {
  this.confetti.fire();
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'WrConfetti.fire(opts?)',
      description: 'Fires a confetti burst from the screen center.',
      type: 'service method',
      default: '—',
    },
  ];
}
