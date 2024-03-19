import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '#core/shared.module';

import { HomeComponent } from './home.component';
import { HomeRouting } from './home.routing';
import { provideWrIcons, wrIconMoon, wrIconWarning } from 'ngwr/icon';

@NgModule({
  imports: [CommonModule, SharedModule, HomeRouting],
  declarations: [HomeComponent],
  providers: [
    provideWrIcons([wrIconWarning])
  ]
})
export class HomeModule {}
