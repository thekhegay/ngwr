import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrIconModule } from 'ngwr/icon';
import { WrSpinnerModule } from 'ngwr/spinner';

import { WrTag } from './tag';

@NgModule({
  imports: [CommonModule, WrIconModule, WrSpinnerModule],
  declarations: [WrTag],
  exports: [WrTag],
})
export class WrTagModule {}
