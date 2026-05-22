import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrColorPickerComponent, WrColorPickerTriggerDirective } from 'ngwr/color-picker';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-color-picker-page',
  templateUrl: './color-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrColorPickerComponent,
    WrColorPickerTriggerDirective,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ColorPickerPageComponent {
  protected readonly basic = signal('#3969e2');
  protected readonly opaque = signal('#f51c6a');
  protected readonly branded = signal('#00a400');
  protected readonly triggered = signal('#ffba00');

  protected readonly palette: readonly string[] = [
    '#3969e2',
    '#f51c6a',
    '#00a400',
    '#ffba00',
    '#fa383e',
    '#cbd5e1',
    '#8594a4',
    '#0f172a',
  ];

  protected readonly snippets = {
    install: `import { WrColorPickerComponent, WrColorPickerTriggerDirective } from 'ngwr/color-picker';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [WrColorPickerComponent, WrColorPickerTriggerDirective, FormsModule],
})
export class MyComponent {
  protected readonly color = signal('#3969e2');
}`,

    basic: `<wr-color-picker [(ngModel)]="color" />`,

    opaque: `<wr-color-picker [(ngModel)]="color" [alpha]="false" />`,

    swatches: `<wr-color-picker
  [(ngModel)]="color"
  [swatches]="['#3969e2', '#f51c6a', '#00a400', '#ffba00', '#fa383e', '#cbd5e1', '#8594a4', '#0f172a']"
/>`,

    trigger: `<button wrColorPickerTrigger
        [(value)]="color"
        [swatches]="palette">
  <span class="swatch" [style.background]="color"></span>
  {{ color }}
</button>`,

    utils: `import { parseHex, toHex, rgbToHsl } from 'ngwr/color-picker';

const rgb = parseHex('#3969e2');        // { r: 57, g: 105, b: 226, a: 1 }
const hsl = rgbToHsl(rgb!);             // { h: 220, s: 0.74, l: 0.55, a: 1 }
const back = toHex(rgb!, true);         // '#3969e2ff'`,
  };

  protected readonly pickerApi: readonly DocApiRow[] = [
    { name: 'alpha', description: 'Render the alpha slider; emit 8-digit hex.', type: 'boolean', default: 'true' },
    {
      name: 'format',
      description: 'Output format (currently only `hex` is wired).',
      type: 'WrColorFormat',
      default: "'hex'",
    },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    {
      name: 'swatches',
      description: 'Optional row of preset hex colours rendered below the inputs.',
      type: 'readonly string[]',
      default: '[]',
    },
  ];

  protected readonly triggerApi: readonly DocApiRow[] = [
    { name: 'value', description: 'Two-way bindable hex string.', type: 'string', default: "''" },
    { name: 'alpha', description: 'Forwarded to the inner picker.', type: 'boolean', default: 'true' },
    { name: 'format', description: 'Forwarded to the inner picker.', type: 'WrColorFormat', default: "'hex'" },
    { name: 'swatches', description: 'Forwarded to the inner picker.', type: 'readonly string[]', default: '[]' },
    { name: 'disabled', description: 'Disable the trigger itself.', type: 'boolean', default: 'false' },
  ];

  protected readonly triggerEvents: readonly DocApiRow[] = [
    { name: 'opened', description: 'Fires after the picker overlay opens.', type: '() => void', default: '—' },
    { name: 'closed', description: 'Fires after the picker overlay closes.', type: '() => void', default: '—' },
  ];

  protected readonly utilsApi: readonly DocApiRow[] = [
    {
      name: 'parseHex(s)',
      description: 'Parse a 3/4/6/8-digit hex string into `WrRgb`. Returns `null` on invalid input.',
      type: '(s: string) => WrRgb | null',
      default: '—',
    },
    {
      name: 'toHex(rgb, withAlpha?)',
      description: 'Format `WrRgb` as a hex string with leading `#`.',
      type: '(rgb: WrRgb, withAlpha?: boolean) => string',
      default: '—',
    },
    {
      name: 'rgbToHsv / hsvToRgb',
      description: 'RGB ↔ HSV conversions, alpha-preserving.',
      type: 'function',
      default: '—',
    },
    {
      name: 'rgbToHsl / hslToRgb',
      description: 'RGB ↔ HSL conversions, alpha-preserving.',
      type: 'function',
      default: '—',
    },
  ];
}
