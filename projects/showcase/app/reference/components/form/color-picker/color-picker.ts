import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrButton } from 'ngwr/button';
import { WrColorPicker, WrColorPickerTrigger } from 'ngwr/color-picker';

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
  templateUrl: './color-picker.html',
  imports: [
    FormsModule,
    WrButton,
    WrColorPicker,
    WrColorPickerTrigger,
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
    basic: `<wr-color-picker [(value)]="color" />`,

    opaque: `<wr-color-picker [(value)]="color" [alpha]="false" />`,

    swatches: `<wr-color-picker
  [(value)]="color"
  [swatches]="['#3969e2', '#f51c6a', '#00a400', '#ffba00', '#fa383e', '#cbd5e1', '#8594a4', '#0f172a']"
/>`,

    trigger: `<button wrColorPickerTrigger
        [(value)]="color"
        [swatches]="palette">
  <span class="swatch" [style.background]="color()"></span>
  {{ color() }}
</button>`,

    utils: `import { parseHex, toHex, rgbToHsl } from 'ngwr/color-picker';

const rgb = parseHex('#3969e2');        // { r: 57, g: 105, b: 226, a: 1 }
const hsl = rgbToHsl(rgb!);             // { h: 222.96, s: 0.744, l: 0.555, a: 1 }
const back = toHex(rgb!, true);         // '#3969e2ff'`,
    exportAs: `<button type="button" wrColorPickerTrigger [(value)]="brand" #swatch="wrColorPickerTrigger">
  Brand colour
</button>

<!-- Anywhere else in the same template -->
<wr-btn (click)="swatch.open()">Pick a colour</wr-btn>
<span [style.color]="swatch.value()">{{ swatch.value() }}</span>`,
  };

  protected readonly pickerApi: readonly DocApiRow[] = [
    {
      name: 'value',
      description: 'The colour, written in the `format` notation. Any notation is read on the way in.',
      type: 'string',
      default: "''",
    },
    {
      name: 'alpha',
      description: 'Show the alpha slider and keep alpha in the value.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'format',
      description: 'The notation `value` is written in: `hex`, `rgba` or `hsla`.',
      type: 'WrColorFormat',
      default: "'hex'",
    },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    {
      name: 'readonly',
      description: 'Refuse changes. Every part stays focusable and the colour still submits.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'swatches',
      description: 'Preset hex colours shown below the inputs.',
      type: 'readonly string[]',
      default: '[]',
    },
    {
      name: '(touch)',
      description: 'Emitted on blur, so a bound signal-forms field can mark itself touched.',
      type: 'void',
      default: '—',
    },
  ];

  protected readonly triggerApi: readonly DocApiRow[] = [
    {
      name: 'value',
      description: 'Two-way bindable colour string, in whatever `format` names.',
      type: 'string',
      default: "''",
    },
    { name: 'alpha', description: 'Forwarded to the inner picker.', type: 'boolean', default: 'true' },
    { name: 'format', description: 'Forwarded to the inner picker.', type: 'WrColorFormat', default: "'hex'" },
    { name: 'swatches', description: 'Forwarded to the inner picker.', type: 'readonly string[]', default: '[]' },
    { name: 'disabled', description: 'Disable the trigger itself.', type: 'boolean', default: 'false' },
    {
      name: 'panelClass',
      description: 'Class(es) on the overlay pane.',
      type: 'WrClassInput',
      default: 'null',
    },
  ];

  protected readonly triggerEvents: readonly DocApiRow[] = [
    { name: '(opened)', description: 'Fires after the picker overlay opens.', type: 'void', default: '—' },
    { name: '(closed)', description: 'Fires after the picker overlay closes.', type: 'void', default: '—' },
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
      description: 'Convert between RGB and HSV, keeping alpha.',
      type: 'function',
      default: '—',
    },
    {
      name: 'rgbToHsl / hslToRgb',
      description: 'Convert between RGB and HSL, keeping alpha.',
      type: 'function',
      default: '—',
    },
  ];
}
