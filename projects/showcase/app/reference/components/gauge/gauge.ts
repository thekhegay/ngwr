import { Component } from '@angular/core';

import { WrGauge } from 'ngwr/gauge';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-gauge-page',
  templateUrl: './gauge.html',
  imports: [WrGauge, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class GaugePageComponent {
  protected readonly snippets = {
    install: `import { WrGauge } from 'ngwr/gauge';

@Component({ imports: [WrGauge] })
export class MyComponent {}`,
    basic: `<wr-gauge [value]="72" suffix="%" />`,
    colored: `<wr-gauge [value]="9.5" [min]="0" [max]="10" suffix="/10" valueColor="var(--wr-color-warning)" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'value', description: 'Value to display.', type: 'number', required: true },
    { name: 'min', description: 'Lower bound of the range.', type: 'number', default: '0' },
    { name: 'max', description: 'Upper bound of the range.', type: 'number', default: '100' },
    { name: 'size', description: 'Diameter in CSS pixels.', type: 'number', default: '160' },
    { name: 'strokeWidth', description: 'Arc stroke thickness, out of 100.', type: 'number', default: '10' },
    {
      name: 'trackColor',
      description: 'Color of the background track.',
      type: 'string',
      default: "'rgba(var(--wr-color-light-rgb), 0.6)'",
    },
    {
      name: 'valueColor',
      description: 'Color of the value arc.',
      type: 'string',
      default: "'var(--wr-color-primary)'",
    },
    { name: 'showValue', description: 'Show the value text in the center.', type: 'boolean', default: 'true' },
    { name: 'suffix', description: 'Text appended after the value.', type: 'string', default: "''" },
  ];
}
