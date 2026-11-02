import { Component, computed, signal } from '@angular/core';

import { WrIridescence } from 'ngwr/bits/iridescence';
import { WrButton } from 'ngwr/button';
import { WrCard } from 'ngwr/card';
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
  selector: 'ngwr-iridescence-page',
  templateUrl: './iridescence.html',
  imports: [
    WrIridescence,
    WrButton,
    WrCard,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocSnippetComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class IridescencePage {
  // Live demo state.
  //
  // The colour starts EMPTY, for the reason `aurora` records: the theme's colour
  // differs per scheme, so a prefilled value would freeze whichever scheme the
  // page loaded in. Empty means the component follows its own hook.
  protected readonly color = signal('');
  protected readonly speed = signal(1);
  protected readonly amplitude = signal(1);
  protected readonly followPointer = signal(true);

  protected readonly snippet = computed(() => {
    const color = this.color() ? `\n    color="${this.color()}"` : '';
    const follow = this.followPointer() ? '' : '\n    [followPointer]="false"';
    // The wrapper is part of the recipe: the silk fills its nearest positioned
    // ancestor. No text in it: on the light default text needs a scrim or a card,
    // which is what the hero below shows.
    return `<section style="position: relative; min-height: 18rem; overflow: hidden">
  <wr-iridescence${color}
    [speed]="${this.speed()}"
    [amplitude]="${this.amplitude()}"${follow}
  />
</section>`;
  });

  protected readonly controls: readonly DocControl[] = [
    { kind: 'color', label: 'Colour', signal: this.color, alpha: false },
    { kind: 'slider', label: 'Speed', signal: this.speed, min: -3, max: 3, step: 0.1, precision: 1 },
    { kind: 'slider', label: 'Amplitude', signal: this.amplitude, min: -3, max: 3, step: 0.1, precision: 1 },
    { kind: 'toggle', label: 'Follow pointer', signal: this.followPointer },
  ];

  protected readonly snippets = {
    hero: `<section class="hero">
  <wr-iridescence />
  <wr-card class="hero__card">
    <h3>Drape it behind the launch</h3>
    <p>The folds stay behind the card, and the button stays clickable.</p>
    <wr-btn color="primary">Get started</wr-btn>
  </wr-card>
</section>

<style>
  .hero {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 22rem;
    padding: 2rem;
    overflow: hidden;
  }
  .hero__card { max-width: 26rem; text-align: center; }
</style>`,
    tint: `<section style="position: relative; min-height: 12rem; overflow: hidden">
  <wr-iridescence color="var(--wr-color-primary)" />
</section>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'color',
      description:
        'Tint multiplied over the picture, any opaque CSS colour: the canvas drops alpha and the stand-in keeps it. Unset, empty or blank, it follows the theme.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'speed',
      description: 'Speed of the folds; 0 holds them, a negative value reverses them. Changing it never jumps them.',
      type: 'number',
      default: '1',
    },
    {
      name: 'amplitude',
      description:
        'How hard the pointer stirs the folds; 0 leaves the pointer out, a negative value stirs the other way.',
      type: 'number',
      default: '1',
    },
    {
      name: 'followPointer',
      description: 'Whether the pointer stirs the folds at all.',
      type: 'boolean',
      default: 'true',
    },
  ];
}
