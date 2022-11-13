import { ModuleWithProviders, NgModule } from '@angular/core';

import { WrIcon } from './icon';
import { WrIconService } from './icon-service';

@NgModule({
  declarations: [WrIcon],
  exports: [WrIcon],
})
export class WrIconModule {
  static forRoot(): ModuleWithProviders<WrIconModule> {
    WrIconService.registerIcons();
    return { ngModule: WrIconModule };
  }
}
