import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { WrIconModule } from 'ngwr/icon';
import { HIGHLIGHT_OPTIONS, HighlightOptions } from 'ngx-highlightjs';

import { FooterComponent, HeaderComponent, LayoutComponent, RootComponent, SharedModule } from './@shared';
import { SiteRouting } from './site.routing';

@NgModule({
  imports: [BrowserModule, SiteRouting, SharedModule, WrIconModule.forRoot()],
  declarations: [RootComponent, LayoutComponent, HeaderComponent, FooterComponent],
  providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: <HighlightOptions>{
        fullLibraryLoader: () => import('highlight.js')
      }
    }
  ],
  bootstrap: [RootComponent]
})
export class SiteModule {}
