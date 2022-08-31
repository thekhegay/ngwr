import { PlatformModule } from '@angular/cdk/platform';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrInputModule } from '../input';
import { WrExtendedInputComponent } from './extended-input.component';

@NgModule({
  imports: [CommonModule, PlatformModule, WrInputModule],
  declarations: [WrExtendedInputComponent],
  exports: [WrExtendedInputComponent]
})
export class WrExtendedInputModule {}