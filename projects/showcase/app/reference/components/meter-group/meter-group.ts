import { Component } from '@angular/core';

import { WrMeterGroup } from 'ngwr/meter-group';

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
  protected readonly diskUsage = [
    { label: 'System', value: 32 },
    { label: 'Apps', value: 88 },
    { label: 'Documents', value: 24 },
    { label: 'Free', value: 112, color: 'var(--wr-color-light)' },
  ];

  protected readonly snippet = `<wr-meter-group
  [segments]="[
    { label: 'Used', value: 60 },
    { label: 'Reserved', value: 25, color: 'var(--wr-color-warning)' }
  ]"
  [max]="100"
/>`;

  protected readonly api = API.WrMeterGroup;

  protected readonly segmentApi: readonly DocApiRow[] = [
    { name: 'label', type: 'string', default: '—', description: 'Legend label.' },
    { name: 'value', type: 'number', default: '—', description: 'Slice size — proportional to total.' },
    {
      name: 'color',
      type: 'string',
      default: 'auto',
      description: 'CSS color (any value). Falls through to a rotating palette of theme tokens when omitted.',
    },
  ];

  protected readonly typeSnippet = `interface WrMeterSegment {
  label: string;
  value: number;
  color?: string;
}`;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrMeterSegment', description: 'One segment of the bar.', type: 'interface' },
    { name: 'label', description: 'Label shown in the legend.', type: 'string', required: true, sub: true },
    { name: 'value', description: 'Portion of the sum of all segments.', type: 'number', required: true, sub: true },
    {
      name: 'color',
      description: 'CSS color for the slice and legend swatch.',
      type: 'string',
      default: 'palette',
      sub: true,
    },
  ];
}
