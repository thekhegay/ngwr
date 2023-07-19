import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { WrIconModule } from 'ngwr/icon';
import { HIGHLIGHT_OPTIONS, HighlightOptions } from 'ngx-highlightjs';
import { HeaderComponent, LayoutComponent, SidebarComponent } from 'showcase/@core/components';
import { SharedModule } from 'showcase/@shared/shared.module';

import { NgwrRouting } from './ngwr.routing';

@NgModule({
  imports: [BrowserModule, BrowserAnimationsModule, NgwrRouting, SharedModule, WrIconModule.forRoot()],
  declarations: [LayoutComponent, HeaderComponent, SidebarComponent],
  bootstrap: [LayoutComponent],
  providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: <HighlightOptions>{
        fullLibraryLoader: () => import('highlight.js'),
        themePath: 'assets/hljs/hljs-theme.css',
        lineNumbersLoader: () => import('ngx-highlightjs/line-numbers'),
      },
    },
  ],
})
export class NgwrModule {}
