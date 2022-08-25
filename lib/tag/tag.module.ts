import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WrTagComponent } from './tag.component';
import { WrSpinnerModule } from '../spinner';

@NgModule({
  imports: [CommonModule, WrSpinnerModule],
  declarations: [WrTagComponent],
  exports: [WrTagComponent]
})
export class WrTagModule {}
