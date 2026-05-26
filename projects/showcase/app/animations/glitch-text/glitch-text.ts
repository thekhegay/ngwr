import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrGlitchText } from 'ngwr/glitch-text';

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
  selector: 'ngwr-glitch-text-page',
  templateUrl: './glitch-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrGlitchText,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class GlitchTextPage {
  protected readonly snippets = {
    install: `import { WrGlitchText } from 'ngwr/glitch-text';`,
    hover: `<wr-glitch-text text="ERROR" />`,
    always: `<wr-glitch-text
  text="404"
  [enableOnHover]="false"
  [speed]="0.5"
/>`,
    noShadows: `<wr-glitch-text
  text="MONO GLITCH"
  [enableShadows]="false"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to glitch. Populates `data-text` for the pseudo clones.', type: 'string', default: '— (required)', required: true },
    { name: 'speed', description: 'Time multiplier — higher = slower glitching.', type: 'number', default: '1' },
    { name: 'enableShadows', description: 'Show the red / cyan colour-split shadows.', type: 'boolean', default: 'true' },
    { name: 'enableOnHover', description: 'Only glitch on hover (idle until then).', type: 'boolean', default: 'true' },
  ];
}
