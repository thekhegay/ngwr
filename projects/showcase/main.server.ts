import type { ApplicationRef } from '@angular/core';
import { type BootstrapContext, bootstrapApplication } from '@angular/platform-browser';

import { serverConfig } from './app/app.config.server';

import { RootComponent } from '#root';

/**
 * Prerender entry. `outputMode: 'static'` calls this once per route at build
 * time to produce the static HTML; no server bundle ships to production.
 *
 * The `BootstrapContext` must be forwarded — on the server there is no ambient
 * platform, and bootstrapping without it fails route extraction with NG0401
 * ("Missing Platform").
 */
const bootstrap = (context: BootstrapContext): Promise<ApplicationRef> =>
  bootstrapApplication(RootComponent, serverConfig, context);

export default bootstrap;
