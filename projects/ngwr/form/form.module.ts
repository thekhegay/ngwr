import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WalrusFormItemComponent } from './form-item.component';
import { WalrusFormErrorComponent } from './form-error.component';

@NgModule({
  imports: [CommonModule],
  declarations: [
    WalrusFormItemComponent,
    WalrusFormErrorComponent
  ],
  exports: [
    WalrusFormItemComponent,
    WalrusFormErrorComponent
  ]
})
export class WalrusFormModule {}
