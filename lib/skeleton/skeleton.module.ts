import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WrSkeletonComponent } from './skeleton.component';
import { WrSpinnerModule } from '../spinner';

@NgModule({
  imports: [CommonModule, WrSpinnerModule],
  declarations: [WrSkeletonComponent],
  exports: [WrSkeletonComponent]
})
export class WalrusSkeletonModule {}
