import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrIconModule } from '../icon';
import { WrSpinnerModule } from '../spinner';
import { WrTagComponent } from './tag.component';

@NgModule({
  imports: [CommonModule, WrIconModule, WrSpinnerModule],
  declarations: [WrTagComponent],
  exports: [WrTagComponent]
})
export class WrTagModule {}
