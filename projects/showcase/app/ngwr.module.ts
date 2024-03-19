import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { HIGHLIGHT_OPTIONS, HighlightOptions } from 'ngx-highlightjs';

import { NgwrRouting } from './ngwr.routing';

import { FooterComponent, HeaderComponent, LayoutComponent, RootComponent, SidebarComponent } from '#core/components';
import { SharedModule } from '#core/shared.module';
import { provideWrIcons, wrIconSet, wrIconUser, wrIconWarning } from 'ngwr/icon';

@NgModule({
  imports: [BrowserModule, BrowserAnimationsModule, NgwrRouting, SharedModule],
  declarations: [RootComponent, LayoutComponent, HeaderComponent, FooterComponent, SidebarComponent],
  bootstrap: [RootComponent],
  providers: [
    provideWrIcons(wrIconSet),
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
