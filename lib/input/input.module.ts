import { PlatformModule } from '@angular/cdk/platform';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrInputDirective } from './input.directive';

@NgModule({
  imports: [CommonModule, PlatformModule],
  declarations: [WrInputDirective],
  exports: [WrInputDirective]
})
export class WrInputModule {}
