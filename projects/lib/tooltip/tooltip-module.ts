import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrOverlayModule } from 'ngwr/core/overlay';

import { WrTooltipComponent } from './tooltip-component';
import { WrTooltipDirective } from './tooltip-directive';

@NgModule({
  imports: [CommonModule, OverlayModule, WrOverlayModule],
  declarations: [WrTooltipComponent, WrTooltipDirective],
  exports: [WrTooltipComponent, WrTooltipDirective],
})
export class WrTooltipModule {}
