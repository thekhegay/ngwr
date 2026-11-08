import { Component } from '@angular/core';

import { WrDecode } from 'ngwr/animations/decode';
import { WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocReplayComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-decode-page',
  templateUrl: './decode.html',
  imports: [
    WrDecode,
    WrTag,
    WrButton,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocReplayComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DecodePageComponent {
  protected readonly snippets = {
    basic: `<wr-tag color="primary" outlined><span wrDecode>Developer experience</span></wr-tag>
<h2 wrDecode>Release 15.7 is out.</h2>`,
    hover: `<button wr-btn outlined type="button"><span wrDecode trigger="hover">Hover or focus me</span></button>`,
    glyphs: `<p wrDecode glyphs="01">Resolved in 2.4 ms</p>`,
    timing: `<p wrDecode delay="400" stagger="80">Slow enough to watch each slot lock.</p>`,
    styled: `.readout {
  --wr-decode-tint: color-mix(in srgb, var(--wr-color-primary) 50%, transparent);
}`,
  };

  protected readonly api = API.WrDecode;
}
