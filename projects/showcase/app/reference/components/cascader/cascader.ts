import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrCascader, type WrCascaderOption } from 'ngwr/cascader';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-cascader-page',
  templateUrl: './cascader.html',
  imports: [
    FormsModule,
    JsonPipe,
    WrCascader,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CascaderPage {
  protected readonly locations: readonly WrCascaderOption[] = [
    {
      value: 'us',
      label: 'United States',
      children: [
        {
          value: 'ca',
          label: 'California',
          children: [
            { value: 'la', label: 'Los Angeles' },
            { value: 'sf', label: 'San Francisco' },
          ],
        },
        {
          value: 'ny',
          label: 'New York',
          children: [
            { value: 'nyc', label: 'New York City' },
            { value: 'buf', label: 'Buffalo' },
          ],
        },
      ],
    },
    {
      value: 'kz',
      label: 'Kazakhstan',
      children: [
        {
          value: 'akm',
          label: 'Akmola',
          children: [
            { value: 'astana', label: 'Astana' },
            { value: 'kokshetau', label: 'Kokshetau' },
          ],
        },
        {
          value: 'aty',
          label: 'Almaty',
          children: [
            { value: 'almaty', label: 'Almaty' },
            { value: 'taldykorgan', label: 'Taldykorgan' },
          ],
        },
      ],
    },
    {
      value: 'jp',
      label: 'Japan',
      children: [
        {
          value: 'tk',
          label: 'Tokyo',
          children: [
            { value: 'shibuya', label: 'Shibuya' },
            { value: 'shinjuku', label: 'Shinjuku' },
          ],
        },
      ],
    },
  ];

  protected readonly picked = signal<readonly string[]>(['us', 'ca', 'sf']);
  protected readonly pickedAny = signal<readonly string[]>([]);

  protected readonly snippets = {
    install: `import { WrCascader, type WrCascaderOption } from 'ngwr/cascader';`,
    basic: `<wr-cascader [options]="locations" [(value)]="picked" placeholder="Pick a location" />

locations: WrCascaderOption[] = [
  {
    value: 'us', label: 'United States', children: [
      { value: 'ca', label: 'California', children: [
        { value: 'la', label: 'Los Angeles' },
        { value: 'sf', label: 'San Francisco' },
      ] },
    ],
  },
  // ...
];`,
    changeOnSelect: `<wr-cascader
  [options]="locations"
  [(value)]="picked"
  changeOnSelect
  placeholder="Pick any level"
/>`,
  };

  protected readonly api = API.WrCascader;

  protected readonly typesApi: readonly DocApiRow[] = [
    {
      name: 'WrCascaderOption<T>',
      description:
        '`{ value: T, label: string, disabled?: boolean, children?: WrCascaderOption<T>[] }`. A node without `children` is a leaf.',
      type: 'interface',
      default: '—',
    },
  ];

  protected readonly cssApi: readonly DocApiRow[] = [
    {
      name: '--wr-cascader-col-width',
      description: 'Width of each column in the panel.',
      type: 'length',
      default: '12rem',
    },
    {
      name: '--wr-cascader-max-height',
      description: 'Max height per column before scrolling.',
      type: 'length',
      default: '16rem',
    },
  ];
}
