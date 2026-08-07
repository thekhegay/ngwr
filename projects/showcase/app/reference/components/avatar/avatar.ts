import { Component } from '@angular/core';

import { WrAvatar } from 'ngwr/avatar';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

const SAMPLE_URL = 'https://avatars.githubusercontent.com/u/9893827?v=4';

@Component({
  selector: 'ngwr-avatar-page',
  templateUrl: './avatar.html',
  imports: [WrAvatar, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class AvatarComponent {
  protected readonly sampleUrl = SAMPLE_URL;

  protected readonly snippets = {
    install: `import { WrAvatar } from 'ngwr/avatar';

@Component({ imports: [WrAvatar] })
export class MyComponent {}`,
    basic: `<wr-avatar url="/me.png" alt="Roman" />`,
    sizes: `<wr-avatar url="/me.png" alt="Roman" [size]="32" />
<wr-avatar url="/me.png" alt="Roman" size="4rem" />
<wr-avatar url="/me.png" alt="Roman" size="6rem" />`,
    shape: `<wr-avatar url="/me.png" alt="Roman" shape="square" />
<wr-avatar url="/me.png" alt="Roman" shape="rounded" />
<wr-avatar url="/me.png" alt="Roman" shape="circle" />
<wr-avatar url="/me.png" alt="Roman" shape="squircle" />`,
    initials: `<wr-avatar [size]="48" shape="circle">RK</wr-avatar>`,
  };

  protected readonly api = API.WrAvatar;
}
