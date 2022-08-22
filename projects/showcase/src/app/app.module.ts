import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {
  WalrusButtonModule,
  WalrusDividerModule,
  WalrusExtendedInputModule,
  WalrusFormModule, WalrusInputModule, WalrusPasswordInputModule, WalrusSkeletonModule,
  WalrusSpinnerModule, WalrusTagModule,
  WrIconModule
} from '../../../ngwr/';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    WalrusButtonModule,
    WalrusSpinnerModule,
    WalrusDividerModule,
    WalrusExtendedInputModule,
    WalrusFormModule,
    WalrusInputModule,
    WalrusPasswordInputModule,
    WalrusSkeletonModule,
    WalrusTagModule,
    WrIconModule.withIcons()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
