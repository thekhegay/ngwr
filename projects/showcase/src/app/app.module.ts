import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { WrIconModule } from 'ngwr/icon';
import { MarkdownModule } from 'ngx-markdown';
import { HeaderComponent, LayoutComponent, RootComponent } from 'showcase/@shared/components';
import { SharedModule } from 'showcase/@shared/shared.module';

import { AppRouting } from './app.routing';

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRouting,
    SharedModule,
    WrIconModule.forRoot(),
    MarkdownModule.forRoot(),
  ],
  declarations: [RootComponent, LayoutComponent, HeaderComponent],
  bootstrap: [RootComponent],
})
export class AppModule {}
