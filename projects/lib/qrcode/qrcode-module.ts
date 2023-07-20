import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WrIconModule } from 'ngwr/icon';

import { WrQRCode } from './qrcode';

@NgModule({
  imports: [CommonModule, WrIconModule],
  declarations: [WrQRCode],
  exports: [WrQRCode],
})
export class WrQRCodeModule {}
