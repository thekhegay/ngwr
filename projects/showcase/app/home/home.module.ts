import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '#core/shared.module';

import { HomeComponent } from './home.component';
import { HomeRouting } from './home.routing';

@NgModule({
  imports: [CommonModule, SharedModule, HomeRouting],
  declarations: [HomeComponent],
})
export class HomeModule {}
