import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '#core/shared.module';

import { ColorsComponent } from './colors/colors.component';
import { CoreRouting } from './core.routing';
import { GridComponent } from './grid/grid.component';

@NgModule({
  imports: [CommonModule, SharedModule, CoreRouting],
  declarations: [ColorsComponent, GridComponent],
})
export class CoreModule {}
