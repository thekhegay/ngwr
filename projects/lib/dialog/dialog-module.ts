import { FullscreenOverlayContainer, OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrDialogContainer } from 'ngwr/dialog/dialog-container';
import { WrDialogClose, WrDialogContent, WrDialogFooter, WrDialogTitle } from 'ngwr/dialog/dialog-content-directives';
import { WrDialogService } from 'ngwr/dialog/dialog-service';
import { WrIconModule } from 'ngwr/icon';

@NgModule({
  imports: [CommonModule, OverlayModule, PortalModule, WrIconModule],
  exports: [WrDialogContainer, WrDialogClose, WrDialogTitle, WrDialogContent, WrDialogFooter],
  declarations: [WrDialogContainer, WrDialogClose, WrDialogTitle, WrDialogContent, WrDialogFooter],
  providers: [WrDialogService, { provide: OverlayContainer, useClass: FullscreenOverlayContainer }],
})
export class WrDialogModule {}
