import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {
  WalrusButtonModule,
  WalrusDividerModule,
  WalrusExtendedInputModule,
  WalrusFormModule, WalrusIconsModule, WalrusInputModule, WalrusPasswordInputModule, WalrusSkeletonModule,
  WalrusSpinnerModule, WalrusTagModule
} from 'ngwr';

const walrus = [
  WalrusButtonModule,
  WalrusSpinnerModule,
  WalrusDividerModule,
  WalrusExtendedInputModule,
  WalrusFormModule,
  WalrusInputModule,
  WalrusPasswordInputModule,
  WalrusSkeletonModule,
  WalrusTagModule,
  WalrusIconsModule,
];


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule, ...walrus
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
