import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WrFormItemComponent } from './form-item.component';
import { WrFormErrorComponent } from './form-error.component';

@NgModule({
  imports: [CommonModule],
  declarations: [
    WrFormItemComponent,
    WrFormErrorComponent
  ],
  exports: [
    WrFormItemComponent,
    WrFormErrorComponent
  ]
})
export class WrFormModule {}
