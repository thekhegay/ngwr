import { PlatformModule } from '@angular/cdk/platform';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WalrusPasswordInputComponent } from './password-input.component';
import { WalrusInputModule } from '../input';
import { WalrusIconsRegistry } from '../icon/walrus-icons-registry.service';
import { WalrusIconsModule } from '../icon/walrus-icons.module';

@NgModule({
  imports: [
    CommonModule,
    PlatformModule,
    WalrusInputModule,
    WalrusIconsModule
  ],
  declarations: [
    WalrusPasswordInputComponent,
  ],
  exports: [
    WalrusPasswordInputComponent,
  ]
})
export class WalrusPasswordInputModule {
  constructor(wrIconReg: WalrusIconsRegistry) {
    wrIconReg.registerIcons()
  }
}
