import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { BehaviorSubject } from 'rxjs';

import { provideHighlightOptions } from 'ngx-highlightjs';

import { FOOTER_HEIGHT, HEADER_HEIGHT, SIDEBAR_OPENED } from '#core/components';
import { RootComponent } from '#root';
import { routing } from '#routing';

bootstrapApplication(RootComponent, {
  providers: [
    { provide: HEADER_HEIGHT, useValue: new BehaviorSubject(0) },
    { provide: FOOTER_HEIGHT, useValue: new BehaviorSubject(0) },
    { provide: SIDEBAR_OPENED, useValue: new BehaviorSubject(false) },
    provideAnimations(),
    provideZonelessChangeDetection(),
    provideRouter(routing, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHighlightOptions({
      coreLibraryLoader: () => import('highlight.js/lib/core'),
      lineNumbersLoader: () => import('ngx-highlightjs/line-numbers'),
      languages: {
        css: () => import('highlight.js/lib/languages/css'),
        scss: () => import('highlight.js/lib/languages/scss'),
        ts: () => import('highlight.js/lib/languages/typescript'),
        xml: () => import('highlight.js/lib/languages/xml'),
        shell: () => import('highlight.js/lib/languages/shell'),
      },
    }),
  ],
}).catch(e => console.error(e));
