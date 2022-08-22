import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WalrusSpinnerModule } from '../spinner';
import { WalrusButtonComponent } from './button.component';

@NgModule({
  imports: [CommonModule, WalrusSpinnerModule],
  declarations: [WalrusButtonComponent],
  exports: [WalrusButtonComponent],
})
export class WalrusButtonModule {}
