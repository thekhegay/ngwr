import { Component } from '@angular/core';

import { WrTypewriter } from 'ngwr/animations/typewriter';
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
  selector: 'ngwr-typewriter-page',
  templateUrl: './typewriter.html',
  imports: [
    WrTypewriter,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocReplayComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TypewriterPageComponent {
  protected readonly one: readonly string[] = ['Signal Forms, asserted as a user would fill them.'];
  protected readonly lines: readonly string[] = [
    'Types the first line.',
    'Deletes it, then the second.',
    'Stops here.',
  ];
  protected readonly loop: readonly string[] = ['accessible.', 'tree-shakable.', 'zoneless.'];

  protected readonly snippets = {
    basic: `<p><wr-typewriter [lines]="['Signal Forms, asserted as a user would fill them.']" /></p>`,
    lines: `<p><wr-typewriter [lines]="['Types the first line.', 'Deletes it, then the second.', 'Stops here.']" hold="1200" /></p>`,
    loop: `<p>ngwr is <wr-typewriter [lines]="['accessible.', 'tree-shakable.', 'zoneless.']" loop /></p>`,
    load: `<h1><wr-typewriter [lines]="['Typed from first paint.']" trigger="load" delay="300" /></h1>`,
    styled: `.hero p {
  --wr-typewriter-caret: 3px;
  --wr-typewriter-blink: 0.8s;
}`,
  };

  protected readonly api = API.WrTypewriter;
}
