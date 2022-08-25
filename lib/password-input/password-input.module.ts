import { PlatformModule } from '@angular/cdk/platform';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrPasswordInputComponent } from './password-input.component';
import { WrInputModule } from '../input';
import { WrIconModule } from '../icon';

@NgModule({
  imports: [
    CommonModule,
    PlatformModule,
    WrInputModule,
    WrIconModule
  ],
  declarations: [
    WrPasswordInputComponent,
  ],
  exports: [
    WrPasswordInputComponent,
  ]
})
export class WalrusPasswordInputModule {}
