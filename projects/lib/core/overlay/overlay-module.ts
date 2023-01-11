import { NgModule } from '@angular/core';

import { WrConnectedOverlayDirective } from './connected-overlay-directive';

@NgModule({
  declarations: [WrConnectedOverlayDirective],
  exports: [WrConnectedOverlayDirective],
})
export class WrOverlayModule {}
