import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrSkeleton } from './skeleton';

@NgModule({
  imports: [CommonModule],
  declarations: [WrSkeleton],
  exports: [WrSkeleton],
})
export class WrSkeletonModule {}
