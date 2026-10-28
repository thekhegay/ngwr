import { Component, computed, signal } from '@angular/core';

import { WrRippleGrid } from 'ngwr/bits/ripple-grid';
import { WrButton } from 'ngwr/button';
import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  type DocApiRow,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSnippetComponent,
  ReactbitsCredit,
} from '#core/components';

@Component({
  selector: 'ngwr-ripple-grid-page',
  templateUrl: './ripple-grid.html',
  imports: [
    WrRippleGrid,
    WrButton,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocSnippetComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class RippleGridPage {
  // Live demo state
  protected readonly cellSize = signal(40);
  protected readonly lineWidth = signal(1);
  protected readonly strength = signal(10);
  protected readonly speed = signal(320);
  protected readonly decay = signal(1.4);
  protected readonly idleInterval = signal(0);
  protected readonly rippleOnMove = signal(true);
  // Empty until the reader picks one, so the demo follows the theme's own
  // tokens per scheme — the reason `aurora` records for its stops. An empty
  // colour leaves the hook in charge, exactly as an unset one does.
  protected readonly lineColor = signal('');
  protected readonly rippleColor = signal('');

  protected readonly snippet = computed(() => {
    const extras = [
      this.idleInterval() ? `\n    [idleInterval]="${this.idleInterval()}"` : '',
      this.rippleOnMove() ? '' : '\n    [rippleOnMove]="false"',
      this.lineColor() ? `\n    lineColor="${this.lineColor()}"` : '',
      this.rippleColor() ? `\n    rippleColor="${this.rippleColor()}"` : '',
    ].join('');
    // The wrapper is part of the recipe: the grid fills its nearest positioned
    // ancestor, and content after it needs a position to paint above it.
    return `<section style="position: relative; min-height: 18rem; overflow: hidden">
  <wr-ripple-grid
    [cellSize]="${this.cellSize()}"
    [lineWidth]="${this.lineWidth()}"
    [strength]="${this.strength()}"
    [speed]="${this.speed()}"
    [decay]="${this.decay()}"${extras}
  />
  <h1 style="position: relative">Content above the grid</h1>
</section>`;
  });

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Cell size', signal: this.cellSize, min: 16, max: 96, step: 4, unit: 'px' },
    {
      kind: 'slider',
      label: 'Line width',
      signal: this.lineWidth,
      min: 0.5,
      max: 3,
      step: 0.25,
      precision: 2,
      unit: 'px',
    },
    { kind: 'slider', label: 'Strength', signal: this.strength, min: -20, max: 30, step: 1, unit: 'px' },
    { kind: 'slider', label: 'Speed', signal: this.speed, min: 0, max: 800, step: 20, unit: 'px/s' },
    { kind: 'slider', label: 'Decay', signal: this.decay, min: 0, max: 4, step: 0.1, precision: 1 },
    { kind: 'slider', label: 'Idle interval', signal: this.idleInterval, min: 0, max: 5000, step: 100, unit: 'ms' },
    { kind: 'toggle', label: 'Ripple on move', signal: this.rippleOnMove },
    { kind: 'color', label: 'Line colour', signal: this.lineColor },
    { kind: 'color', label: 'Ripple colour', signal: this.rippleColor },
  ];

  protected readonly snippets = {
    idle: `<section class="hero">
  <wr-ripple-grid [idleInterval]="2400" [rippleOnMove]="false" />
  <div class="hero__content">
    <h2>Make some waves</h2>
    <p>A ring leaves the centre on its own; a press anywhere sends another.</p>
    <wr-btn color="primary">Get started</wr-btn>
  </div>
</section>

<style>
  .hero { position: relative; min-height: 20rem; overflow: hidden; }
  .hero__content {
    position: relative;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 1rem;
    min-height: 20rem;
    padding: 2rem;
    text-align: center;
  }
  .hero__content > * { margin: 0; }
</style>`,
    light: `<section style="position: relative; min-height: 12rem; overflow: hidden">
  <wr-ripple-grid rippleColor="var(--wr-color-success)" [strength]="0" [cellSize]="24" />
</section>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'cellSize',
      description: 'Distance between grid lines (px), never under 12.',
      type: 'number',
      default: '40',
    },
    {
      name: 'lineColor',
      description: 'Line colour. Unset, it follows the theme.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'rippleColor',
      description: 'Colour a line takes where a ripple passes. Unset, it follows the theme.',
      type: 'string | null',
      default: 'null',
    },
    { name: 'lineWidth', description: 'Line width (px), never under 0.25.', type: 'number', default: '1' },
    {
      name: 'strength',
      description:
        'How far a fresh ripple from a press bends the lines (px); a moving pointer bends them 40% as far. 0 only lights them; negative bends them inward. Never far enough to fold a line over: about 0.3 of a cell (11.7px at the default), shared by ripples that overlap.',
      type: 'number',
      default: '10',
    },
    {
      name: 'speed',
      description: 'How fast a ripple travels outward (px per second). 0 keeps it where it started.',
      type: 'number',
      default: '320',
    },
    {
      name: 'decay',
      description: 'How fast a ripple fades, per second: its strength is multiplied by e^-decay each second.',
      type: 'number',
      default: '1.4',
    },
    {
      name: 'rippleOnMove',
      description: 'Whether a moving pointer leaves ripples behind it, and not only a press.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'idleInterval',
      description:
        'Milliseconds between the ripples sent out from the centre on their own, never under 500. 0 sends none.',
      type: 'number',
      default: '0',
    },
  ];
}
