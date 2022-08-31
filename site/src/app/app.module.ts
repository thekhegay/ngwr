import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { WrIconModule } from 'ngwr';

import { SharedModule } from './@shared';
import { AppComponent } from './app.component';

import { HIGHLIGHT_OPTIONS, HighlightOptions } from 'ngx-highlightjs';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, SharedModule, WrIconModule.forRoot()],
  bootstrap: [AppComponent],
  providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: <HighlightOptions>{
        fullLibraryLoader: () => import('highlight.js')
      }
    }
  ]
})
export class AppModule {}
