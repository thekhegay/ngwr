import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrFuzzyText } from 'ngwr/fuzzy-text';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  ReactbitsCredit,
} from '#core/components';

@Component({
  selector: 'ngwr-fuzzy-text-page',
  templateUrl: './fuzzy-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrFuzzyText,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class FuzzyTextPage {
  protected readonly snippets = {
    install: `import { WrFuzzyText } from 'ngwr/fuzzy-text';`,
    basic: `<wr-fuzzy-text text="404" />`,
    tuned: `<wr-fuzzy-text
  text="HELLO"
  color="#0ea5e9"
  [fuzzRange]="60"
  [hoverIntensity]="0.9"
  fontSize="6rem"
/>`,
    glitch: `<wr-fuzzy-text
  text="GLITCH"
  [glitchMode]="true"
  [glitchInterval]="1500"
  [glitchDuration]="250"
  [clickEffect]="true"
/>`,
    gradient: `<wr-fuzzy-text
  text="SUNSET"
  [gradient]="['#f97316', '#dc2626', '#7c3aed']"
  direction="both"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to render.', type: 'string', default: '— (required)', required: true },
    { name: 'fontSize', description: 'Font size as a CSS length or px number.', type: 'string | number', default: "'clamp(2rem, 10vw, 10rem)'" },
    { name: 'fontWeight', description: 'Font weight.', type: 'number | string', default: '900' },
    { name: 'fontFamily', description: "Font family. `'inherit'` reads the canvas's computed style.", type: 'string', default: "'inherit'" },
    { name: 'color', description: 'Text colour. Ignored if `[gradient]` is set.', type: 'string', default: "'#fff'" },
    { name: 'gradient', description: 'Optional horizontal gradient stops (2+ colours).', type: 'readonly string[] | null', default: 'null' },
    { name: 'enableHover', description: 'Enable hover / touch reactivity.', type: 'boolean', default: 'true' },
    { name: 'baseIntensity', description: 'Base intensity (0..1) when idle.', type: 'number', default: '0.18' },
    { name: 'hoverIntensity', description: 'Intensity (0..1) while the pointer hovers the text.', type: 'number', default: '0.5' },
    { name: 'fuzzRange', description: 'Max pixel displacement per row/column at intensity 1.', type: 'number', default: '30' },
    { name: 'fps', description: 'Frame rate cap.', type: 'number', default: '60' },
    { name: 'direction', description: 'Fuzz direction.', type: "'horizontal' | 'vertical' | 'both'", default: "'horizontal'" },
    { name: 'transitionDuration', description: 'Ms to ease intensity toward target. `0` snaps.', type: 'number', default: '0' },
    { name: 'clickEffect', description: 'Spike to full intensity briefly on click.', type: 'boolean', default: 'false' },
    { name: 'glitchMode', description: 'Periodic glitch bursts at full intensity.', type: 'boolean', default: 'false' },
    { name: 'glitchInterval', description: 'Ms between glitch bursts.', type: 'number', default: '2000' },
    { name: 'glitchDuration', description: 'Ms a glitch burst lasts.', type: 'number', default: '200' },
    { name: 'letterSpacing', description: 'Extra pixels between glyphs.', type: 'number', default: '0' },
  ];
}
