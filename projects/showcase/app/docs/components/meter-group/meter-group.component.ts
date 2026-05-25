import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrMeterGroupComponent } from 'ngwr/meter-group';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-meter-group-page',
  templateUrl: './meter-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrMeterGroupComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
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
}
