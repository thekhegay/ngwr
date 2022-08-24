import { PlatformModule } from '@angular/cdk/platform';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WalrusPasswordInputComponent } from './password-input.component';
import { WalrusInputModule } from '../input';
import { WrIconModule } from '../icon';

@NgModule({
  imports: [
    CommonModule,
    PlatformModule,
    WalrusInputModule,
    WrIconModule
  ],
  declarations: [
    WalrusPasswordInputComponent,
  ],
  exports: [
    WalrusPasswordInputComponent,
  ]
})
export class WalrusPasswordInputModule {}
