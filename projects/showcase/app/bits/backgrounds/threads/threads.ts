import { Component, computed, signal } from '@angular/core';

import { WrThreads } from 'ngwr/bits/threads';
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
  selector: 'ngwr-threads-page',
  templateUrl: './threads.html',
  imports: [
    WrThreads,
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
export default class ThreadsPage {
  // Live demo state.
  //
  // The colour starts EMPTY, for the reason `aurora` records: the theme's colour
  // differs per scheme, so a prefilled value would freeze whichever scheme the
  // page loaded in. Empty means the component follows its own hook.
  protected readonly color = signal('');
  protected readonly lineCount = signal(18);
  protected readonly amplitude = signal(40);
  protected readonly spread = signal(0.4);
  protected readonly speed = signal(1);
  protected readonly lineWidth = signal(1);
  protected readonly followPointer = signal(true);

  protected readonly snippet = computed(() => {
    const color = this.color() ? `\n    color="${this.color()}"` : '';
    const follow = this.followPointer() ? '' : '\n    [followPointer]="false"';
    // The wrapper is part of the recipe: the canvas fills its nearest
    // positioned ancestor, and the content after it needs a position of its
    // own to sit above it.
    return `<section style="position: relative; min-height: 18rem">
  <wr-threads${color}
    [lineCount]="${this.lineCount()}"
    [amplitude]="${this.amplitude()}"
    [spread]="${this.spread()}"
    [speed]="${this.speed()}"
    [lineWidth]="${this.lineWidth()}"${follow}
  />
  <h1 style="position: relative">Content above the threads</h1>
</section>`;
  });

  protected readonly controls: readonly DocControl[] = [
    { kind: 'color', label: 'Colour', signal: this.color },
    { kind: 'slider', label: 'Lines', signal: this.lineCount, min: 1, max: 60, step: 1 },
    { kind: 'slider', label: 'Amplitude', signal: this.amplitude, min: 0, max: 120, step: 2, unit: 'px' },
    { kind: 'slider', label: 'Spread', signal: this.spread, min: 0, max: 1, step: 0.05, precision: 2 },
    { kind: 'slider', label: 'Speed', signal: this.speed, min: 0, max: 3, step: 0.1, precision: 1 },
    {
      kind: 'slider',
      label: 'Line width',
      signal: this.lineWidth,
      min: 0.5,
      max: 4,
      step: 0.25,
      precision: 2,
      unit: 'px',
    },
    { kind: 'toggle', label: 'Follow pointer', signal: this.followPointer },
  ];

  protected readonly heroSnippet = `<section class="hero">
  <wr-threads [lineCount]="24" [spread]="0.6" />
  <div class="hero__content">
    <h2>Ship the quiet parts</h2>
    <p>The threads stay behind the copy, and the buttons stay clickable.</p>
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
</style>`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'lineCount',
      description: 'How many threads, rounded and kept between 1 and 100.',
      type: 'number',
      default: '18',
    },
    {
      name: 'color',
      description: 'Thread colour, any CSS colour. Emptied, it follows the theme.',
      type: 'string',
      default: "'var(--wr-threads-color)'",
    },
    {
      name: 'amplitude',
      description: 'How far the bundle meanders up and down, in px.',
      type: 'number',
      default: '40',
    },
    {
      name: 'speed',
      description: 'Speed of the current; 0 holds it, a negative value reverses it.',
      type: 'number',
      default: '1',
    },
    { name: 'lineWidth', description: 'Stroke width of each thread, in px.', type: 'number', default: '1' },
    {
      name: 'spread',
      description: 'Share of the box height the threads fan across at their widest, 0..1.',
      type: 'number',
      default: '0.4',
    },
    {
      name: 'followPointer',
      description: 'Whether the threads near the pointer bend toward it.',
      type: 'boolean',
      default: 'true',
    },
  ];
}
