import { PlatformModule } from '@angular/cdk/platform';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WalrusInputDirective } from './input.directive';

@NgModule({
  imports: [CommonModule, PlatformModule],
  declarations: [
    WalrusInputDirective,
  ],
  exports: [
    WalrusInputDirective,
  ]
})
export class WalrusInputModule {}
