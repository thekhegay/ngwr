import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrSpinnerModule } from '../spinner';
import { WrSkeletonComponent } from './skeleton.component';

@NgModule({
  imports: [CommonModule, WrSpinnerModule],
  declarations: [WrSkeletonComponent],
  exports: [WrSkeletonComponent]
})
export class WalrusSkeletonModule {}
