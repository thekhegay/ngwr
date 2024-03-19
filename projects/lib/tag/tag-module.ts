import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrIconModule } from 'ngwr/icon';
import { WrSpinModule } from 'ngwr/spin';

import { WrTag } from './tag';

@NgModule({
  imports: [CommonModule, WrIconModule, WrSpinModule],
  declarations: [WrTag],
  exports: [WrTag],
})
export class WrTagModule {}
