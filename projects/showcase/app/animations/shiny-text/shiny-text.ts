import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrShimmer, WrShinyText } from 'ngwr/shiny-text';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSnippetComponent,
  ReactbitsCredit,
} from '#core/components';

@Component({
  selector: 'ngwr-shiny-text-page',
  templateUrl: './shiny-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrShinyText,
    WrShimmer,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class ShinyTextPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly text = signal('Premium');
  protected readonly speed = signal(2);
  protected readonly spread = signal(120);
  protected readonly direction = signal<'left' | 'right'>('left');
  protected readonly yoyo = signal(false);
  protected readonly pauseOnHover = signal(false);

  protected readonly snippet = computed(
    () =>
      `<wr-shiny-text
  text="${this.text()}"
  [speed]="${this.speed()}"
  [spread]="${this.spread()}"
  direction="${this.direction()}"
  [yoyo]="${this.yoyo()}"
  [pauseOnHover]="${this.pauseOnHover()}"
/>`,
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Speed (s)', signal: this.speed, min: 0.5, max: 8, step: 0.1, precision: 1, unit: 's' },
    { kind: 'slider', label: 'Spread (°)', signal: this.spread, min: 30, max: 180, step: 5, unit: '°' },
    { kind: 'select', label: 'Direction', signal: this.direction, options: ['left', 'right'] as const },
    { kind: 'toggle', label: 'Yoyo', signal: this.yoyo },
    { kind: 'toggle', label: 'Pause on Hover', signal: this.pauseOnHover },
    { kind: 'text', label: 'Text', signal: this.text, placeholder: 'Text to shimmer' },
  ];

  protected readonly snippets = {
    install: `import { WrShinyText } from 'ngwr/shiny-text';`,
    shimmer: `import { WrShimmer } from 'ngwr/shiny-text';

<h1 wrShimmer>Premium</h1>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to render.', type: 'string', default: '— (required)', required: true },
    { name: 'disabled', description: 'Pause the animation.', type: 'boolean', default: 'false' },
    { name: 'speed', description: 'Time for the bright stripe to traverse the text, in seconds.', type: 'number', default: '2' },
    { name: 'color', description: 'Base text colour (outside the bright stripe).', type: 'string', default: "'#b5b5b5'" },
    { name: 'shineColor', description: 'Bright stripe colour.', type: 'string', default: "'#ffffff'" },
    { name: 'spread', description: 'Gradient angle in degrees.', type: 'number', default: '120' },
    { name: 'yoyo', description: 'Bounce back-and-forth instead of restarting.', type: 'boolean', default: 'false' },
    { name: 'pauseOnHover', description: 'Pause the animation while hovered.', type: 'boolean', default: 'false' },
    { name: 'direction', description: 'Sweep direction.', type: "'left' | 'right'", default: "'left'" },
    { name: 'delay', description: 'Pause between sweeps in seconds.', type: 'number', default: '0' },
    {
      name: '[wrShimmer]',
      description: 'Lightweight directive variant — adds the `.wr-shimmer` host class for a continuous sweep over any element. Same package.',
      type: 'directive',
      default: '—',
    },
  ];
}
