import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrReveal } from 'ngwr/directives';

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
  selector: 'ngwr-reveal-page',
  templateUrl: './reveal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrReveal, DocPageComponent, DocSectionComponent, DocPlaygroundComponent, DocCodeComponent, DocApiComponent],
})
export default class RevealPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly threshold = signal(0.1);
  protected readonly rootMargin = signal('0px');
  protected readonly once = signal(true);

  protected readonly replayKey = signal(0);

  protected readonly snippet = computed(
    () =>
      `<!-- Add 'ngwr/animations' for the .wr-reveal enter styles. -->
<div
  wrReveal
  [threshold]="${this.threshold()}"
  rootMargin="${this.rootMargin()}"
  [once]="${this.once()}"
>
  Animates in once visible
</div>`,
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Threshold', signal: this.threshold, min: 0, max: 1, step: 0.05, precision: 2 },
    { kind: 'toggle', label: 'Once', signal: this.once },
    { kind: 'text', label: 'Root Margin', signal: this.rootMargin, placeholder: '0px' },
  ];

  protected replay(): void {
    this.replayKey.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import { WrReveal } from 'ngwr/directives';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrReveal]',
      description: 'Adds `.wr-reveal--visible` once the host enters the viewport. Pair with `ngwr/animations` styles.',
      type: 'directive',
      default: '—',
    },
    { name: 'threshold', description: 'IntersectionObserver threshold (0..1).', type: 'number', default: '0.1' },
    { name: 'rootMargin', description: 'IntersectionObserver rootMargin.', type: 'string', default: "'0px'" },
    { name: 'once', description: 'If `false`, re-runs every time the host enters the viewport.', type: 'boolean', default: 'true' },
  ];
}
