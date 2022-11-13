import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrCheckbox } from './checkbox';

@NgModule({
  imports: [CommonModule, FormsModule, A11yModule],
  declarations: [WrCheckbox],
  exports: [WrCheckbox],
})
export class WrCheckboxModule {}
