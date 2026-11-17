/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Injector, inject } from '@angular/core';

import { WrI18n, wrInterpolate } from './i18n';

/** The English catalog's `httpError`, for an app with no catalog registered. */
const FALLBACK: Readonly<Record<string, string>> = {
  network: 'No connection to the server. Check your network and try again.',
  400: 'The server did not accept the data. Check the fields.',
  401: 'Your session has ended. Sign in again.',
  403: 'You do not have permission for this action.',
  404: 'Not found. It may have been deleted.',
  409: 'This conflicts with existing data. Refresh the page and try again.',
  413: 'The data is too large to send.',
  422: 'Some of the data is not valid. Check the fields.',
  429: 'Too many requests. Try again in a moment.',
  503: 'The server is unavailable. Try again in a minute.',
  '4xx': 'The request was refused. Error code: {{status}}.',
  '5xx': 'The server failed. Try again later. Error code: {{status}}.',
  unknown: 'Something went wrong. Try again later.',
};

/** Most specific first. */
function catalogKeys(status: number | null): readonly string[] {
  if (status === null) return ['unknown'];
  if (status === 0) return ['network'];
  if (status >= 400 && status < 500) return [String(status), '4xx', 'unknown'];
  if (status >= 500 && status < 600) return [String(status), '5xx', 'unknown'];
  return [String(status), 'unknown'];
}

function serverMessage(error: unknown): string | null {
  const body = (error as { error?: unknown } | null | undefined)?.error;
  if (typeof body === 'string') {
    const text = body.trim();
    // A proxy answers with an HTML page, which is a string body too.
    return text === '' || text.startsWith('<') ? null : text;
  }
  const message = (body as { message?: unknown } | null | undefined)?.message;
  return typeof message === 'string' && message.trim() !== '' ? message.trim() : null;
}

/** A screen's own sentence for one status: the text, or a function of the error. */
export type WrHttpErrorOverride = string | ((error: unknown) => string);

/** Options of {@link wrHttpErrorText}. */
export interface WrHttpErrorTextOptions {
  /** The screen's own sentence per status, `0` being a network failure. Wins over everything else. */
  readonly overrides?: Readonly<Partial<Record<number, WrHttpErrorOverride>>>;
  /**
   * Prefer the sentence the server put in the body: `error.error.message`, or
   * a body that is a plain string. For an API that writes its errors for the
   * person at the screen.
   * @default false
   */
  readonly serverMessage?: boolean;
  /** Where to read `WrI18n` from when the call is outside an injection context, such as a `catch`. */
  readonly injector?: Injector;
}

/**
 * The HTTP status of a failed request: of an `HttpErrorResponse`, a `Response`
 * or anything else carrying a numeric `status`. `0` is a request nothing
 * answered (offline, CORS, a dropped connection); `null` is a value that is not
 * an HTTP error at all.
 *
 * @example
 * ```ts
 * if (wrHttpStatus(error) === 401) void router.navigate(['/login']);
 * ```
 *
 * @see https://ngwr.dev/reference/utils/wr-http-error-text
 */
export function wrHttpStatus(error: unknown): number | null {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  return typeof status === 'number' && Number.isInteger(status) && status >= 0 ? status : null;
}

/**
 * A sentence for a failed request, in the active language. Highest first:
 *
 * 1. `overrides[status]`, the screen's own wording.
 * 2. With `serverMessage`, the sentence in the response body.
 * 3. The catalog: `httpError.<status>`, then `httpError.4xx` / `httpError.5xx`
 *    (both take `{{status}}`), `httpError.network` for status `0`, and
 *    `httpError.unknown` for the rest. An app's own catalog wins over ngwr's,
 *    and English is the floor when neither has the key.
 *
 * Call it in an injection context, or pass `injector` from a `catch` or a
 * callback.
 *
 * @example
 * ```ts
 * private readonly injector = inject(Injector);
 *
 * try {
 *   await this.api.save(order);
 * } catch (error) {
 *   this.toast.danger(
 *     wrHttpErrorText(error, { injector: this.injector, overrides: { 409: 'This name is taken.' } })
 *   );
 * }
 * ```
 *
 * @see https://ngwr.dev/reference/utils/wr-http-error-text
 */
export function wrHttpErrorText(error: unknown, options: WrHttpErrorTextOptions = {}): string {
  const status = wrHttpStatus(error);

  const override = status === null ? undefined : options.overrides?.[status];
  if (override !== undefined) return typeof override === 'function' ? override(error) : override;

  if (options.serverMessage && status !== null) {
    const said = serverMessage(error);
    if (said !== null) return said;
  }

  const i18n = options.injector ? options.injector.get(WrI18n, null) : inject(WrI18n, { optional: true });
  const keys = catalogKeys(status);
  const params = { status };

  for (const key of keys) {
    const hit = i18n?.t(`httpError.${key}`, params, { fallback: '' });
    if (hit) return hit;
  }
  for (const key of keys) {
    if (key in FALLBACK) return wrInterpolate(FALLBACK[key], params);
  }
  return FALLBACK['unknown'];
}
