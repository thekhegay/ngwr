import { ModuleWithProviders, NgModule } from '@angular/core';
import { WalrusIconComponent } from './icon.component';
import { WalrusIconsRegistry } from './walrus-icons-registry.service';

@NgModule({
  declarations: [WalrusIconComponent],
  exports: [WalrusIconComponent]
})
export class WalrusIconsModule {
  static forRoot(): ModuleWithProviders<NgModule> {
    return {
      ngModule: WalrusIconsModule,
      providers: [WalrusIconsRegistry]
    }
  }
}
