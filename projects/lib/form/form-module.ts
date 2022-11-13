import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrFormError } from './form-error';
import { WrFormItem } from './form-item';

@NgModule({
  imports: [CommonModule],
  declarations: [WrFormItem, WrFormError],
  exports: [WrFormItem, WrFormError],
})
export class WrFormModule {}
