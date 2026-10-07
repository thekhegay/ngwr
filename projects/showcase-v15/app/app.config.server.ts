import { type ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

export const serverConfig: ApplicationConfig = mergeApplicationConfig(appConfig, {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
});
