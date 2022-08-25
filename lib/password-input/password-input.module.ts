import { PlatformModule } from '@angular/cdk/platform';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrIconModule } from '../icon';
import { WrInputModule } from '../input';
import { WrPasswordInputComponent } from './password-input.component';

@NgModule({
  imports: [CommonModule, PlatformModule, WrInputModule, WrIconModule],
  declarations: [WrPasswordInputComponent],
  exports: [WrPasswordInputComponent]
})
export class WalrusPasswordInputModule {}
