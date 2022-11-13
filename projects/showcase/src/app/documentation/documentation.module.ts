import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from 'showcase/@shared/shared.module';

import { DocumentationRouting } from './documentation.routing';
import { InstallationComponent } from './installation/installation.component';

@NgModule({
  imports: [CommonModule, SharedModule, DocumentationRouting],
  declarations: [InstallationComponent],
})
export class DocumentationModule {}
