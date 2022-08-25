import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrSpinnerModule } from '../spinner';
import { WrButtonComponent } from './button.component';

@NgModule({
  imports: [CommonModule, WrSpinnerModule],
  declarations: [WrButtonComponent],
  exports: [WrButtonComponent]
})
export class WrButtonModule {}
