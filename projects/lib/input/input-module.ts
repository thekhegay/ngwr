import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrIconModule } from 'ngwr/icon';

import { WrInput } from './input';

@NgModule({
  imports: [CommonModule, FormsModule, WrIconModule],
  declarations: [WrInput],
  exports: [WrInput],
})
export class WrInputModule {}
