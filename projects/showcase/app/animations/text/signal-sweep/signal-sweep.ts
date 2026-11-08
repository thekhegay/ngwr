import { Component } from '@angular/core';

import { WrSignalSweep } from 'ngwr/animations/signal-sweep';
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
  selector: 'ngwr-signal-sweep-page',
  templateUrl: './signal-sweep.html',
  imports: [
    WrSignalSweep,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocReplayComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class SignalSweepPageComponent {
  protected readonly snippets = {
    basic: `<h1>Components that bind straight to <span wrSignalSweep>Signal Forms</span>.</h1>`,
    delay: `<h1><span wrSignalSweep delay="1200">Signal Forms</span></h1>`,
    styled: `.hero span {
  --wr-signal-sweep-wire: var(--wr-color-success);
  --wr-signal-sweep-duration: 2.4s;
}`,
  };

  protected readonly api = API.WrSignalSweep;
}
