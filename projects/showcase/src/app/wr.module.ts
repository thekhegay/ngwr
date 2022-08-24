import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  WalrusButtonModule,
  WalrusDividerModule,
  WalrusExtendedInputModule,
  WalrusFormModule, WalrusInputModule, WalrusPasswordInputModule, WalrusSkeletonModule,
  WalrusSpinnerModule, WalrusTagModule, WrIconModule, WrIconService
} from '@ngwr';

const modules = [
  WalrusButtonModule,
  WalrusSpinnerModule,
  WalrusDividerModule,
  WalrusExtendedInputModule,
  WalrusFormModule,
  WalrusInputModule,
  WalrusPasswordInputModule,
  WalrusSkeletonModule,
  WalrusTagModule,
  WrIconModule
];

@NgModule({
  imports: [CommonModule, ...modules],
  exports: [...modules]
})
export class WrModule {
  constructor() {
    WrIconService.registerIcons();
  }
}
