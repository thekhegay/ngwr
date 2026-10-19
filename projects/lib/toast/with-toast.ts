/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ApplicationRef, ENVIRONMENT_INITIALIZER, EnvironmentInjector, inject, isDevMode } from '@angular/core';

import { type WrFeature, wrFeature } from 'ngwr/utils';

import { DEFAULT_TOAST_CONFIG } from './default-toast-config';
import { WR_TOAST_CONFIG } from './tokens';
import type { WrToastConfig } from './types';

/**
 * Registers a global {@link WrToastConfig} for {@link WrToast}, as a feature of
 * `provideWr()`. Any field you omit falls back to {@link DEFAULT_TOAST_CONFIG};
 * the `labels` sub-object is merged separately so you can override a single
 * string at a time (useful for i18n).
 *
 * @example
 * ```ts
 * import { provideWr } from 'ngwr';
 * import { withToast } from 'ngwr/toast';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWr(
 *       withToast({
 *         position: 'bottom-end',
 *         showCopy: true,
 *         maxStack: 3,
 *         labels: { close: 'Закрыть' },
 *       }),
 *     ),
 *   ],
 * });
 * ```
 *
 * **Bootstrap only, unlike the icon registry.** {@link WrToast} is
 * root-provided, so it reads this token once from the ROOT injector — a
 * `provideWr(withToast())` in a route's `providers` is never seen, and used to
 * be ignored in silence. It now warns in dev mode instead. By contrast
 * `provideWrIcons()` works at any level and chains, so a route may add icons to
 * the set its parent registered.
 */
export function withToast(
  config: Partial<Omit<WrToastConfig, 'labels'>> & { readonly labels?: Partial<WrToastConfig['labels']> }
): WrFeature<'toast'> {
  const merged: WrToastConfig = {
    ...DEFAULT_TOAST_CONFIG,
    ...config,
    labels: { ...DEFAULT_TOAST_CONFIG.labels, ...config.labels },
  };
  return wrFeature('toast', [
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
              // because a feature function cannot know where it was spread.
              const here = inject(EnvironmentInjector);
              if (here !== inject(ApplicationRef).injector) {
                // eslint-disable-next-line no-console -- dev-mode misconfiguration diagnostic
                console.warn(
                  '[NGWR] withToast() is in a route or child injector, where WrToast will never read it — ' +
                    'the service is root-provided and resolves WR_TOAST_CONFIG once, from the root. Move ' +
                    'provideWr(withToast()) to the application providers, or set the same fields per call on toast.show().'
                );
              }
            },
          },
        ]
      : []),
  ]);
}
