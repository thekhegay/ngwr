import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrSkeletonComponent } from './skeleton.component';

@NgModule({
  imports: [CommonModule],
  declarations: [WrSkeletonComponent],
  exports: [WrSkeletonComponent]
})
export class WrSkeletonModule {}
