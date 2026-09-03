import { Component, signal } from '@angular/core';

import { WrSlider } from 'ngwr/slider';
import { WrSquircle, WrSquircleHost } from 'ngwr/squircle';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-squircle-page',
  templateUrl: './squircle.html',
  imports: [
    WrSlider,
    WrSquircle,
    WrSquircleHost,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class SquirclePageComponent {
  protected readonly radius = signal(28);
  protected readonly smoothing = signal(1);

  protected readonly snippets = {
    install: `import { WrSquircle, WrSquircleHost } from 'ngwr/squircle';`,

    standalone: `<wr-squircle [radius]="24" style="width: 160px; height: 160px; background: var(--wr-color-primary)" />`,

    directive: `<!-- works on any element -->
<button wr-btn wrSquircle [radius]="16">Save</button>
<wr-tag wrSquircle>v2.0</wr-tag>
<img wrSquircle [radius]="32" src="avatar.jpg" alt="" />`,
    exportAs: `<div wrSquircle [radius]="20" #shape="wrSquircle">Card</div>

<!-- Anywhere else in the same template -->
<wr-btn (click)="shape.enabled.set(!shape.enabled())">Toggle the squircle</wr-btn>
<wr-btn (click)="shape.borderWidth.set(2)">Add a ring</wr-btn>`,
  };

  protected readonly api = API.WrSquircle;
}
