import { Component, signal } from '@angular/core';

import { Moon, Settings, Sun } from 'lucide';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

@Component({
  selector: 'ngwr-segmented-page',
  templateUrl: './segmented.html',
  imports: [WrSegmented, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
  providers: [provideWrIcons(lucideIcons({ sun: Sun, moon: Moon, cog: Settings }))],
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
    {
      name: 'size',
      description: 'Control size; shares the `--wr-control-*` contract.',
      type: `'sm' | 'md' | 'lg'`,
      default: `'md'`,
    },
  ];

  protected readonly typeSnippet = `interface WrSegmentedOption<T = unknown> {
  value: T;
  label?: string;
  icon?: WrIconName;
  disabled?: boolean;
}`;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrSegmentedOption', description: 'One entry in the track.', type: 'interface' },
    { name: 'value', description: 'Model value when this segment is picked.', type: 'T', required: true, sub: true },
    { name: 'label', description: 'Visible text; omit for icon-only segments.', type: 'string', sub: true },
    { name: 'icon', description: 'Leading icon.', type: 'WrIconName', sub: true },
    { name: 'disabled', description: 'Disable this segment.', type: 'boolean', default: 'false', sub: true },
  ];
}
