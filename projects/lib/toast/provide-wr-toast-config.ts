/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ApplicationRef,
  ENVIRONMENT_INITIALIZER,
  type EnvironmentProviders,
  EnvironmentInjector,
  inject,
  isDevMode,
  makeEnvironmentProviders,
} from '@angular/core';

import { DEFAULT_TOAST_CONFIG } from './default-toast-config';
import type { WrToastConfig } from './interfaces';
import { WR_TOAST_CONFIG } from './tokens';

/**
 * Registers a global {@link WrToastConfig} for {@link WrToast}. Any
 * field you omit falls back to {@link DEFAULT_TOAST_CONFIG}; the `labels`
 * sub-object is merged separately so you can override a single string at a
 * time (useful for i18n).
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWrToastConfig({
 *       position: 'bottom-end',
 *       showCopy: true,
 *       maxStack: 3,
 *       labels: { close: 'Закрыть' },
 *     }),
 *   ],
 * });
 * ```
 *
 * **Bootstrap only, and the three ngwr providers differ here.** {@link WrToast}
 * is root-provided, so it reads this token once from the ROOT injector — a
 * `provideWrToastConfig()` in a route's `providers` is never seen, and used to
 * be ignored in silence. It now warns in dev mode instead. By contrast
 * `provideWrConfig()` IS read per route, because components resolve it from
 * their own injector, and `provideWrIcons()` works at any level and chains, so
 * a route may add icons to the set its parent registered.
 */
export function provideWrToastConfig(
  config: Partial<Omit<WrToastConfig, 'labels'>> & { readonly labels?: Partial<WrToastConfig['labels']> }
): EnvironmentProviders {
  const merged: WrToastConfig = {
    ...DEFAULT_TOAST_CONFIG,
    ...config,
    labels: { ...DEFAULT_TOAST_CONFIG.labels, ...config.labels },
  };
  return makeEnvironmentProviders([
    { provide: WR_TOAST_CONFIG, useValue: merged },
    ...(isDevMode()
      ? [
          {
            provide: ENVIRONMENT_INITIALIZER,
            multi: true,
            useValue: (): void => {
              // Compared by identity against the application's own injector: a
              // route creates a child EnvironmentInjector, and the root-provided
              // service will resolve the token from the root regardless of what
              // this one holds. Reported here rather than at the call site,
              // because a provider function cannot know where it was spread.
              const here = inject(EnvironmentInjector);
              if (here !== inject(ApplicationRef).injector) {
                // eslint-disable-next-line no-console -- dev-mode misconfiguration diagnostic
                console.warn(
                  '[NGWR] provideWrToastConfig() is in a route or child injector, where WrToast will never read it — ' +
                    'the service is root-provided and resolves WR_TOAST_CONFIG once, from the root. Move it to the ' +
                    'application providers, or set the same fields per call on toast.show().'
                );
              }
            },
          },
        ]
      : []),
  ]);
}
