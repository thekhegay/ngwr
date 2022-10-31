import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrIconModule } from '../icon';
import { WrInputComponent } from './input.component';

@NgModule({
  imports: [CommonModule, FormsModule, WrIconModule],
  declarations: [WrInputComponent],
  exports: [WrInputComponent]
})
export class WrInputModule {}
