import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';

import { Check, ChevronDown, Copy, Download, Moon, Plus, Sun, Trash2, TriangleAlert, X } from 'lucide';
import { provideWrDateAdapter } from 'ngwr/date';
import { provideWrDensity } from 'ngwr/density';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { provideWrOverlay } from 'ngwr/overlay';
import { provideWrTheme } from 'ngwr/theme';

/**
 * Everything a consumer is told to wire up, and nothing a docs site needs.
 *
 * Deliberately NOT a copy of the showcase's config: no router, no hydration, no
 * i18n catalogs, no markdown highlighter. The point of this app is to be the
 * plainest thing that can render a component, so that when a component looks
 * wrong here the cause is the component or its documentation rather than
 * something the showcase does around it.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    // Its own CDK overlay container, plus the visual-viewport watcher. Without
    // it every overlay lands in whatever container another library installed.
    provideWrOverlay(),
    // Writes the theme attribute on <html>. Skip it and the light tokens stay
    // put, which on a dark-mode machine is near-black text on a dark canvas.
    provideWrTheme(),
    provideWrDensity(),
    // Needed by the calendar and every date-picker mode; its absence is a
    // NullInjectorError rather than a degraded render.
    provideWrDateAdapter(),
    // Add icons here as demos need them — ngwr ships none.
    provideWrIcons(
      lucideIcons({
        add: Plus,
        check: Check,
        copy: Copy,
        download: Download,
        trash: Trash2,
        'chevron-down': ChevronDown,
        moon: Moon,
        sun: Sun,
        'triangle-alert': TriangleAlert,
        x: X,
      })
    ),
  ],
};
