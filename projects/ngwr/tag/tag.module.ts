import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WalrusTagComponent } from './tag.component';
import { WalrusSpinnerModule } from '../spinner';

@NgModule({
  imports: [CommonModule, WalrusSpinnerModule],
  declarations: [WalrusTagComponent],
  exports: [WalrusTagComponent]
})
export class WalrusTagModule {}
