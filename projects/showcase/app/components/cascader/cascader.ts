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
    basic: `<wr-cascader [options]="locations" [(ngModel)]="picked" placeholder="Pick a location" />

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
  [(ngModel)]="picked"
  changeOnSelect
  placeholder="Pick any level"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'options',
      description: 'Root-level options. Each may include `children` to define deeper levels.',
      type: 'WrCascaderOption<T>[]',
      default: '— (required)',
      required: true,
    },
    { name: 'placeholder', description: 'Shown when no path is selected.', type: 'string', default: "''" },
    { name: 'disabled', description: 'Disable the cascader.', type: 'boolean', default: 'false' },
    {
      name: 'clearable',
      description: 'Show a clear-all (×) button when something is selected.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'changeOnSelect',
      description: 'Commit a path on every click (parents too). When `false`, only leaves commit.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'separator', description: 'Joiner between labels in the trigger.', type: 'string', default: "'/'" },
    {
      name: 'ngModel / formControl',
      description: 'Bound value is the full path as `readonly T[]`. Empty array when nothing is selected.',
      type: 'readonly T[]',
      default: '[]',
    },
    {
      name: 'WrCascaderOption<T>',
      description:
        '`{ value: T, label: string, disabled?: boolean, children?: WrCascaderOption<T>[] }`. A node without `children` is a leaf.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'CSS — --wr-cascader-col-width',
      description: 'Width of each column in the panel.',
      type: 'length',
      default: '12rem',
    },
    {
      name: 'CSS — --wr-cascader-max-height',
      description: 'Max height per column before scrolling.',
      type: 'length',
      default: '16rem',
    },
  ];
}
