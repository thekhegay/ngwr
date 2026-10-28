import { Component, computed, signal } from '@angular/core';

import { WrDotGrid } from 'ngwr/bits/dot-grid';
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
  selector: 'ngwr-dot-grid-page',
  templateUrl: './dot-grid.html',
  imports: [
    WrDotGrid,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocSnippetComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class DotGridPage {
  // Live demo state
  protected readonly dotSize = signal(3);
  protected readonly gap = signal(24);
  protected readonly radius = signal(120);
  protected readonly strength = signal(12);
  // Empty until the reader picks one, so the demo follows the theme's own
  // tokens per scheme — the reason `aurora` records for its stops.
  protected readonly dotColor = signal('');
  protected readonly activeColor = signal('');

  protected readonly snippet = computed(() => {
    const colors = [
      this.dotColor() ? `\n    dotColor="${this.dotColor()}"` : '',
      this.activeColor() ? `\n    activeColor="${this.activeColor()}"` : '',
    ].join('');
    // The wrapper is part of the recipe: the grid fills its nearest positioned
    // ancestor, and content after it needs a position to paint above it.
    return `<section style="position: relative; min-height: 18rem; overflow: hidden">
  <wr-dot-grid
    [dotSize]="${this.dotSize()}"
    [gap]="${this.gap()}"
    [radius]="${this.radius()}"
    [strength]="${this.strength()}"${colors}
  />
  <h1 style="position: relative">Content above the dots</h1>
</section>`;
  });

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Dot size', signal: this.dotSize, min: 1, max: 10, step: 0.5, precision: 1, unit: 'px' },
    { kind: 'slider', label: 'Gap', signal: this.gap, min: 8, max: 60, step: 1, unit: 'px' },
    { kind: 'slider', label: 'Radius', signal: this.radius, min: 40, max: 300, step: 10, unit: 'px' },
    { kind: 'slider', label: 'Strength', signal: this.strength, min: -24, max: 40, step: 1, unit: 'px' },
    { kind: 'color', label: 'Dot colour', signal: this.dotColor },
    { kind: 'color', label: 'Active colour', signal: this.activeColor },
  ];

  protected readonly snippets = {
    tokens: `<section style="position: relative; min-height: 12rem; overflow: hidden">
  <wr-dot-grid activeColor="var(--wr-color-success)" [strength]="0" [gap]="18" />
</section>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'dotSize', description: 'Dot diameter (px).', type: 'number', default: '3' },
    { name: 'gap', description: 'Distance between dot centres (px), never under 4.', type: 'number', default: '24' },
    {
      name: 'dotColor',
      description: 'Resting dot colour. Unset, it follows the theme.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'activeColor',
      description: 'Colour a dot takes near the pointer. Unset, it follows the theme.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'radius',
      description: 'How far from the pointer a dot still reacts (px).',
      type: 'number',
      default: '120',
    },
    {
      name: 'strength',
      description: 'How far a dot by the pointer is pushed (px). 0 only lights it; negative pulls it in.',
      type: 'number',
      default: '12',
    },
  ];
}
