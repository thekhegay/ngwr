import { Directive, inject, input, TemplateRef } from '@angular/core';

import { WrTableCellContext } from '../types';

@Directive({
  selector: '[wrTableCell]',
})
export class WrTableCellDirective {
  columnKey = input.required<string>({ alias: 'wrTableCell' });

  template = inject(TemplateRef<WrTableCellContext>);
}
