import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WalrusSkeletonComponent } from './skeleton.component';
import { WalrusSpinnerModule } from '../spinner';

@NgModule({
  imports: [CommonModule, WalrusSpinnerModule],
  declarations: [WalrusSkeletonComponent],
  exports: [WalrusSkeletonComponent]
})
export class WalrusSkeletonModule {}
