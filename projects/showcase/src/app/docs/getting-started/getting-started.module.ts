import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from 'showcase/@shared/shared.module';

import { GettingStartedRouting } from './getting-started.routing';
import { InstallationComponent } from './installation/installation.component';

@NgModule({
  imports: [CommonModule, SharedModule, GettingStartedRouting],
  declarations: [InstallationComponent],
})
export class GettingStartedModule {}
