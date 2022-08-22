import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {
  WalrusButtonModule,
  WalrusDividerModule,
  WalrusExtendedInputModule,
  WalrusFormModule, WalrusIconsModule, WalrusInputModule, WalrusPasswordInputModule, WalrusSkeletonModule,
  WalrusSpinnerModule, WalrusTagModule,
  WalrusIconsRegistry
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
    WalrusIconsModule.forRoot(),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(private readonly i: WalrusIconsRegistry) {
    this.i.registerIcons();
  }
}
