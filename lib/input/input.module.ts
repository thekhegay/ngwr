import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformModule } from '@angular/cdk/platform';

import { WrInputDirective } from './input.directive';

@NgModule({
  imports: [CommonModule, PlatformModule],
  declarations: [WrInputDirective,],
  exports: [WrInputDirective,]
})
export class WrInputModule {}
