import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { NgwrModule } from './app/ngwr.module';

import { environment } from '#env';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(NgwrModule)
  .catch(err => console.error(err));
