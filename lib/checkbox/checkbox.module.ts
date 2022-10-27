import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrCheckboxComponent } from './checkbox.component';

@NgModule({
  imports: [CommonModule, FormsModule, A11yModule],
  declarations: [WrCheckboxComponent],
  exports: [WrCheckboxComponent]
})
export class WrCheckboxModule {}
