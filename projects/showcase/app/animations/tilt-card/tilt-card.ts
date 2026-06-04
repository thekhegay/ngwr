import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrTilt, WrTiltCard } from 'ngwr/tilt-card';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-tilt-card-page',
  templateUrl: './tilt-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrTiltCard,
    WrTilt,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TiltCardPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly maxTilt = signal(12);
  protected readonly perspective = signal(800);
  protected readonly scale = signal(1.03);
  protected readonly glare = signal(false);

  protected readonly snippet = computed(
    () =>
      `<wr-tilt-card
  [maxTilt]="${this.maxTilt()}"
  [perspective]="${this.perspective()}"
  [scale]="${this.scale()}"
  [glare]="${this.glare()}"
>
  <h3>Hover me</h3>
  <p>Move the cursor across me.</p>
</wr-tilt-card>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Max Tilt (°)', signal: this.maxTilt, min: 0, max: 45, step: 1, unit: '°' },
    { kind: 'slider', label: 'Perspective (px)', signal: this.perspective, min: 200, max: 2000, step: 50, unit: 'px' },
    { kind: 'slider', label: 'Scale', signal: this.scale, min: 1, max: 1.2, step: 0.01, precision: 2 },
    { kind: 'toggle', label: 'Glare', signal: this.glare },
  ];

  protected readonly snippets = {
    install: `import { WrTiltCard, WrTilt } from 'ngwr/tilt-card';`,
    directive: `// Directive variant — same package, drops on any element.
import { WrTilt } from 'ngwr/tilt-card';

<img wrTilt [maxTilt]="10" [scale]="1.02" src="…" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'maxTilt', description: 'Maximum tilt in degrees.', type: 'number', default: '12' },
    { name: 'perspective', description: 'CSS perspective in pixels.', type: 'number', default: '800' },
    { name: 'scale', description: 'Scale applied while hovered.', type: 'number', default: '1.03' },
    { name: 'glare', description: 'Add a moving glare highlight overlay.', type: 'boolean', default: 'false' },
    {
      name: '[wrTilt]',
      description: 'Directive variant — same inputs as `<wr-tilt-card>`. Drops on any element.',
      type: 'directive',
      default: '—',
    },
  ];
}
