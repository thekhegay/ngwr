import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { WrIconModule } from 'ngwr/icon';
import { HIGHLIGHT_OPTIONS, HighlightOptions } from 'ngx-highlightjs';
import { HeaderComponent, LayoutComponent, RootComponent } from 'showcase/@shared/components';
import { SharedModule } from 'showcase/@shared/shared.module';

import { AppRouting } from './app.routing';

@NgModule({
  imports: [BrowserModule, AppRouting, SharedModule, WrIconModule.forRoot()],
  declarations: [RootComponent, LayoutComponent, HeaderComponent],
  providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: <HighlightOptions>{
        fullLibraryLoader: () => import('highlight.js'),
        themePath: 'assets/hljs/github.css',
      },
    },
  ],
  bootstrap: [RootComponent],
})
export class AppModule {}
