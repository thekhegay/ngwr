import { bootstrapApplication } from '@angular/platform-browser';

import { appConfig } from './app/app.config';

import { RootComponent } from '#root';

void bootstrapApplication(RootComponent, appConfig);
