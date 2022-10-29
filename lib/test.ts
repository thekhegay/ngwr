// eslint-disable-next-line import/no-unassigned-import
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
// Then we find all the tests.
const context = require.context('../lib', true, /\.spec\.ts$/);
// And load the modules.
context.keys().forEach(context);
