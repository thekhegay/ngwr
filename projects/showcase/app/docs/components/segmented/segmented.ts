import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { provideWrIcons, sun, moon, cog } from 'ngwr/icon';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-segmented-page',
  templateUrl: './segmented.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrSegmented, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
  providers: [provideWrIcons([sun, moon, cog])],
})
export default class SegmentedPageComponent {
  protected readonly range = signal<string>('week');
  protected readonly mode = signal<string>('light');

  protected readonly rangeOptions: readonly WrSegmentedOption<string>[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

  protected readonly modeOptions: readonly WrSegmentedOption<string>[] = [
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'System', icon: 'cog' },
  ];

  protected readonly snippets = {
    install: `import { WrSegmented } from 'ngwr/segmented';

@Component({ imports: [WrSegmented] })
export class MyComponent {}`,
    basic: `<wr-segmented [options]="options" [(value)]="range" />`,
    icons: `<wr-segmented
  [options]="[
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
  ]"
  [(value)]="mode"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'options',
      description: 'Segments to render.',
      type: 'readonly WrSegmentedOption[]',
      required: true,
    },
    { name: 'value', description: 'Selected value. Two-way bindable.', type: 'T | null', default: 'null' },
    { name: 'disabled', description: 'Disable the whole control.', type: 'boolean', default: 'false' },
  ];
}
