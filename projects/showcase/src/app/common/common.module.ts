import { CommonModule as NgCommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from 'showcase/@shared/shared.module';

import { ColorsComponent } from './colors/colors.component';
import { CommonRouting } from './common.routing';
import { GridComponent } from './grid/grid.component';

@NgModule({
  imports: [NgCommonModule, SharedModule, CommonRouting],
  declarations: [ColorsComponent, GridComponent],
})
export class CommonModule {}
