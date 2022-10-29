import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrIconModule } from '../icon';
import { WrSpinnerModule } from '../spinner';
import { WrButtonComponent } from './button.component';

@NgModule({
  imports: [CommonModule, WrSpinnerModule, WrIconModule],
  declarations: [WrButtonComponent],
  exports: [WrButtonComponent]
})
export class WrButtonModule {}
