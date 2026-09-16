import { Component, signal } from '@angular/core';

import { WrAvatar } from 'ngwr/avatar';
import { WrTag } from 'ngwr/badge';
import { WrOptionLeading, WrSelect } from 'ngwr/select';

import {
  DocApiComponent,
  DocCodeComponent,
  type DocCodeFile,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

const SAMPLE_URL = 'https://avatars.githubusercontent.com/u/9893827?v=4';

/** An image the showcase ships itself. */
const LOCAL_URL = 'images/image_1.webp';

/**
 * Bytes that are not an image. It fails in the decoder rather than on the
 * network, so the fallback demo neither depends on nor adds a 404.
 */
const BROKEN_URL = 'data:image/png;base64,bm90IGFuIGltYWdl';

interface Person {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly photo: string | null;
}

/**
 * The two widest capital pairs in each script beside two ordinary ones — the
 * initials the default share of the box was measured against.
 */
const PEOPLE: readonly Person[] = [
  { id: 'hr', name: 'Хегай Роман', initials: 'ХР', photo: null },
  { id: 'zh', name: 'Жуков Шамиль', initials: 'ЖШ', photo: BROKEN_URL },
  { id: 'rk', name: 'Rick Kowalski', initials: 'RK', photo: null },
  { id: 'ww', name: 'Walter White', initials: 'WW', photo: null },
];

@Component({
  selector: 'ngwr-avatar-page',
  templateUrl: './avatar.html',
  imports: [
    WrAvatar,
    WrOptionLeading,
    WrSelect,
    WrTag,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class AvatarComponent {
  protected readonly sampleUrl = SAMPLE_URL;
  protected readonly localUrl = LOCAL_URL;
  protected readonly brokenUrl = BROKEN_URL;

  protected readonly scaleSizes = [16, 20, 24, 32, 40, 48, 64] as const;
  protected readonly people = PEOPLE;
  protected readonly peopleIds = PEOPLE.map(p => p.id);
  protected readonly assignees = signal<string[]>(['hr', 'zh', 'ww']);

  protected readonly personName = (id: unknown): string => this.person(id)?.name ?? String(id);
  protected readonly personInitials = (id: unknown): string => this.person(id)?.initials ?? '';
  protected readonly personPhoto = (id: unknown): string | null => this.person(id)?.photo ?? null;

  private person(id: unknown): Person | undefined {
    return PEOPLE.find(p => p.id === id);
  }

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
    initialsScale: `<!-- The text around each is 15px: the small ones cap it, 40px and up keep it. -->
<wr-avatar shape="circle" [size]="16">ХР</wr-avatar>
<wr-avatar shape="circle" [size]="24">ХР</wr-avatar>
<wr-avatar shape="circle" [size]="40">ХР</wr-avatar>
<wr-avatar shape="circle" size="6rem">ХР</wr-avatar>`,
    initialsScaleCss: `/* A different share of the box, for one group of avatars. */
.team .wr-avatar {
  --wr-avatar-initials-scale: 0.3;
}`,
    withImage: `<wr-avatar
  [url]="user.photo"
  alt="Roman Khegay"
  [size]="64"
  shape="circle"
  style="background: var(--wr-color-primary-soft); color: var(--wr-color-primary-ink); font-weight: 600"
>
  RK
</wr-avatar>`,
    broken: `<!-- The request fails, so the initials stay. -->
<wr-avatar
  url="/missing.png"
  alt="Roman Khegay"
  [size]="64"
  shape="circle"
  style="background: var(--wr-color-primary-soft); color: var(--wr-color-primary-ink); font-weight: 600"
>
  RK
</wr-avatar>`,
  };

  protected readonly smallFiles: readonly DocCodeFile[] = [
    {
      label: 'HTML',
      language: 'angular-html',
      code: `<wr-select
  mode="multi"
  searchable
  virtualScroll
  placeholder="Nobody"
  [options]="peopleIds"
  [displayWith]="personName"
  [(value)]="assignees"
>
  <ng-template wrOptionLeading let-personId let-placement="placement">
    <wr-avatar
      shape="circle"
      [size]="placement === 'chip' ? 16 : 24"
      [url]="personPhoto(personId)"
      [alt]="personName(personId)"
      >{{ personInitials(personId) }}</wr-avatar
    >
  </ng-template>
</wr-select>

@for (id of assignees(); track id) {
  <wr-tag size="sm" color="medium">
    <span class="assignee">
      <wr-avatar shape="circle" [size]="16" [url]="personPhoto(id)" [alt]="personName(id)">{{
        personInitials(id)
      }}</wr-avatar>
      <a routerLink="/people">{{ personName(id) }}</a>
    </span>
  </wr-tag>
}`,
    },
    {
      label: 'SCSS',
      language: 'scss',
      code: `.assignee {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}`,
    },
  ];

  protected readonly api = API.WrAvatar;
}
