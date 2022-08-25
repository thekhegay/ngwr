import { ModuleWithProviders, NgModule } from '@angular/core';
import { WrIconComponent } from './wr-icon.component';
import { WrIconService } from './wr-icon.service';

@NgModule({
  declarations: [WrIconComponent],
  exports: [WrIconComponent]
})
export class WrIconModule {
  static forRoot(): ModuleWithProviders<WrIconModule> {
    WrIconService.registerIcons();
    return { ngModule: WrIconModule };
  }
}
