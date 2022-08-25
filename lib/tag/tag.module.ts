import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrSpinnerModule } from '../spinner';
import { WrTagComponent } from './tag.component';

@NgModule({
  imports: [CommonModule, WrSpinnerModule],
  declarations: [WrTagComponent],
  exports: [WrTagComponent]
})
export class WrTagModule {}
