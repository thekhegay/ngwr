import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrAvatar } from 'ngwr/avatar';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

const SAMPLE_URL = 'https://avatars.githubusercontent.com/u/9893827?v=4';

@Component({
  selector: 'ngwr-avatar-page',
  templateUrl: './avatar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    rounded: `<wr-avatar url="/me.png" alt="Roman" rounded />`,
    initials: `<wr-avatar [size]="48" rounded>RK</wr-avatar>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'url',
      description: 'Image URL. When unset, only projected content shows.',
      type: 'string | null',
      default: 'null',
    },
    { name: 'alt', description: 'Alt text for the image.', type: 'string', default: "'Avatar'" },
    {
      name: 'size',
      description: 'Box size. Accepts number, px, or rem string.',
      type: 'WrAvatarSize',
      default: "'6rem'",
    },
    { name: 'rounded', description: 'Render as a circle.', type: 'boolean', default: 'false' },
  ];
}
