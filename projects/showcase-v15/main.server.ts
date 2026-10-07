import type { ApplicationRef } from '@angular/core';
import { type BootstrapContext, bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { serverConfig } from './app/app.config.server';

const bootstrap = (context: BootstrapContext): Promise<ApplicationRef> =>
  bootstrapApplication(App, serverConfig, context);

export default bootstrap;
