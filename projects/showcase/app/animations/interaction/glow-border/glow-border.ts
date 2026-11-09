import { Component, signal } from '@angular/core';

import { WrGlowBorder } from 'ngwr/animations/glow-border';
import { WrButton } from 'ngwr/button';
import { WrSwitch } from 'ngwr/switch';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-glow-border-page',
  templateUrl: './glow-border.html',
  imports: [
    WrGlowBorder,
    WrButton,
    WrSwitch,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class GlowBorderPageComponent {
  protected readonly active = signal(true);

  protected readonly snippets = {
    basic: `<a wr-btn outlined size="lg" routerLink="/docs" wrGlowBorder>Get started</a>`,
    parent: `.hero {
  position: relative;
  isolation: isolate;
}`,
    active: `<button wr-btn outlined type="button" wrGlowBorder [active]="live()">Stop and start</button>`,
    colours: `<button wr-btn outlined type="button" wrGlowBorder>Primary</button>
<button wr-btn outlined type="button" wrGlowBorder style="--wr-glow-border-color: var(--wr-color-success)">Success</button>
<button wr-btn outlined type="button" wrGlowBorder style="--wr-glow-border-color: var(--wr-color-danger)">Danger</button>
<button wr-btn outlined type="button" wrGlowBorder style="--wr-glow-border-color: var(--wr-color-on-surface-muted)">Neutral</button>`,
    period: `<button wr-btn outlined type="button" wrGlowBorder style="--wr-glow-border-width: 2px; --wr-glow-border-strength: 0.9; --wr-glow-border-period: 2s">
  Thicker, brighter, faster
</button>`,
  };

  protected readonly api = API.WrGlowBorder;
}
