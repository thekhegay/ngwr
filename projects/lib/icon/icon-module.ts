import { ModuleWithProviders, NgModule } from '@angular/core';

import { WrIcon } from './icon';
import { wrIconSet } from './icons';
import { provideWrIcons } from './provide-wr-icons';

@NgModule({
  declarations: [WrIcon],
  exports: [WrIcon],
})
export class WrIconModule {
  /** @deprecated Will be removed in v4 */
  static forRoot(): ModuleWithProviders<WrIconModule> {
    return {
      ngModule: WrIconModule,
      providers: [provideWrIcons(wrIconSet)],
    };
  }
}
