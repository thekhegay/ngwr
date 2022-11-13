import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrIconModule } from 'ngwr/icon';
import { WrSpinnerModule } from 'ngwr/spinner';

import { WrButton } from './button';

@NgModule({
  imports: [CommonModule, WrSpinnerModule, WrIconModule],
  declarations: [WrButton],
  exports: [WrButton],
})
export class WrButtonModule {}
