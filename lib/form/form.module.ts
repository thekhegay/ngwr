import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrFormErrorComponent } from './form-error.component';
import { WrFormItemComponent } from './form-item.component';

@NgModule({
  imports: [CommonModule],
  declarations: [WrFormItemComponent, WrFormErrorComponent],
  exports: [WrFormItemComponent, WrFormErrorComponent]
})
export class WrFormModule {}
