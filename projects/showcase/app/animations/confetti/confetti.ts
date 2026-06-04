import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { WrConfetti } from 'ngwr/confetti';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-confetti-page',
  templateUrl: './confetti.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocPlaygroundComponent, DocCodeComponent, DocApiComponent],
})
export default class ConfettiPage {
  private readonly confetti = inject(WrConfetti);

  // ── Live demo state ─────────────────────────────────────────────
  protected readonly count = signal(80);
  protected readonly spread = signal(60);
  protected readonly velocity = signal(12);
  protected readonly gravity = signal(0.35);

  protected readonly snippet = computed(
    () =>
      `private readonly confetti = inject(WrConfetti);

onWin(): void {
  this.confetti.fire({
    count: ${this.count()},
    spread: ${this.spread()},
    velocity: ${this.velocity()},
    gravity: ${this.gravity()},
  });
}`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Count', signal: this.count, min: 10, max: 300, step: 5 },
    { kind: 'slider', label: 'Spread (°)', signal: this.spread, min: 10, max: 360, step: 5, unit: '°' },
    { kind: 'slider', label: 'Velocity', signal: this.velocity, min: 2, max: 30, step: 1 },
    { kind: 'slider', label: 'Gravity', signal: this.gravity, min: 0.05, max: 1, step: 0.05, precision: 2 },
  ];

  protected fire(): void {
    this.confetti.fire({
      count: this.count(),
      spread: this.spread(),
      velocity: this.velocity(),
      gravity: this.gravity(),
    });
  }

  protected readonly snippets = {
    install: `import { WrConfetti } from 'ngwr/confetti';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'WrConfetti.fire(opts?)',
      description:
        'Fires a confetti burst. Options: `count`, `spread`, `velocity`, `gravity`, `drag`, `origin`, `colors`, `size`, `ttl`.',
      type: 'service method',
      default: '—',
    },
  ];
}
