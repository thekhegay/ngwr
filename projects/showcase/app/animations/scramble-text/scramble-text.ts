import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrScrambleText } from 'ngwr/scramble-text';

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
  selector: 'ngwr-scramble-text-page',
  templateUrl: './scramble-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrScrambleText,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class ScrambleTextPage {
  protected readonly snippets = {
    install: `import { WrScrambleText } from 'ngwr/scramble-text';`,
    basic: `<wr-scramble-text>
  Hover this paragraph to scramble characters near the cursor.
</wr-scramble-text>`,
    tuned: `<wr-scramble-text
  [radius]="140"
  [duration]="1.8"
  [speed]="0.04"
  scrambleChars="!&%*?<>"
>
  A wider radius, longer scramble, custom glyph pool.
</wr-scramble-text>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'radius', description: 'Proximity radius in pixels — chars within this distance of the cursor will scramble.', type: 'number', default: '100' },
    { name: 'duration', description: 'Max scramble duration in seconds (scaled by proximity — closer = longer).', type: 'number', default: '1.2' },
    { name: 'speed', description: 'Approximate seconds between random-char swaps. Lower = faster scramble.', type: 'number', default: '0.05' },
    { name: 'scrambleChars', description: 'Pool of glyphs to scramble through.', type: 'string', default: "'.:'" },
  ];
}
