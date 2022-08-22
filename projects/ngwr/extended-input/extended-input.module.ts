import { PlatformModule } from '@angular/cdk/platform';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WalrusInputModule } from '../input';
import { WalrusExtendedInputComponent } from './extended-input.component';

@NgModule({
  imports: [
    CommonModule,
    PlatformModule,
    WalrusInputModule,
  ],
  declarations: [WalrusExtendedInputComponent],
  exports: [WalrusExtendedInputComponent]
})
export class WalrusExtendedInputModule {}
