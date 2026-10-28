import { Component, signal } from '@angular/core';

import { WrMeterGroup } from 'ngwr/charts/meter-group';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-meter-group-page',
  templateUrl: './meter-group.html',
  imports: [
    WrMeterGroup,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class MeterGroupPageComponent {
  protected readonly quota = [
    { label: 'Used', value: 60 },
    { label: 'Reserved', value: 25, color: 'var(--wr-color-warning)' },
  ];

  protected readonly diskUsage = [
    { label: 'System', value: 32 },
    { label: 'Apps', value: 88 },
    { label: 'Documents', value: 24 },
    { label: 'Free', value: 112, color: 'var(--wr-color-on-surface-muted)' },
  ];

  protected readonly snippet = `<wr-meter-group
  [segments]="[
    { label: 'Used', value: 60 },
    { label: 'Reserved', value: 25, color: 'var(--wr-color-warning)' }
  ]"
  [max]="100"
/>`;

  protected readonly tooltipSnippet = `<wr-meter-group [segments]="segments" [tooltip]="false" />`;

  protected readonly hiddenSegments = signal<readonly number[]>([]);

  protected readonly toggleSnippet = `<wr-meter-group [segments]="diskUsage" toggleableLegend [(hiddenSegments)]="hidden" />`;

  protected readonly toggleTsSnippet = `diskUsage: WrMeterSegment[] = [
  { label: 'System', value: 32 },
  { label: 'Apps', value: 88 },
  { label: 'Documents', value: 24 },
  { label: 'Free', value: 112, color: 'var(--wr-color-on-surface-muted)' },
];
hidden = signal<readonly number[]>([]);`;

  protected readonly api = API.WrMeterGroup;

  protected readonly typeSnippet = `interface WrMeterSegment {
  label: string;
  value: number;
  color?: string;
}`;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrMeterSegment', description: 'One segment of the bar.', type: 'interface' },
    { name: 'label', description: 'Label shown in the legend.', type: 'string', required: true, sub: true },
    {
      name: 'value',
      description: 'Its share of the bar: of `max` when set, else of the sum of the segments shown.',
      type: 'number',
      required: true,
      sub: true,
    },
    {
      name: 'color',
      description: 'CSS color for the slice and legend swatch.',
      type: 'string',
      default: 'palette',
      sub: true,
    },
  ];
}
