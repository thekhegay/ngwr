import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { provideWrOverlay } from 'ngwr/overlay';

import { RootComponent } from '#root';
import { routing } from '#routing';

void bootstrapApplication(RootComponent, {
  providers: [
    // angular
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routing),
    // ngwr
    provideWrOverlay(),
  ],
});
