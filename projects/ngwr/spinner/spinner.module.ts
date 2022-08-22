import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WalrusSpinnerComponent } from './spinner.component';

@NgModule({
  imports: [CommonModule],
  declarations: [WalrusSpinnerComponent],
  exports: [WalrusSpinnerComponent]
})
export class WalrusSpinnerModule {}
