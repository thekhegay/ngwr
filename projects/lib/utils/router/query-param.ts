/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  PLATFORM_ID,
  Service,
  type WritableSignal,
  assertInInjectionContext,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  type Params,
  Router,
} from '@angular/router';

import type { WrQueryParamOptions, WrQueryParamStringOptions } from './types';

/** One signal following one parameter. */
interface Follower {
  readonly name: string;
  /** The raw value the signal last agreed with, `null` for absent. */
  raw: string | null;
  readonly decode: (raw: string | null) => unknown;
  /** The setter the signal was born with: moves it without writing the address. */
  readonly write: (value: unknown) => void;
}

/**
 * The one writer behind every {@link wrQueryParam}: collects the writes of a
 * task and navigates once with all of them, and moves every follower when a
 * navigation settles.
 */
@Service()
class WrQueryParams {
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly followers = new Set<Follower>();
  /** Writes not yet navigated, per parameter: the raw value, `null` to remove. */
  private readonly batch = new Map<string, { readonly from: Follower; readonly raw: string | null }>();
  private replaceUrl = false;
  private scheduled = false;
  private inFlight: boolean;

  constructor() {
    this.inFlight = untracked(this.router.currentNavigation) !== null;
    const sub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) this.inFlight = true;
      else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof NavigationSkipped
      ) {
        this.inFlight = false;
        this.settle();
      }
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  /** The parameter as the router holds it: the first value of a repeated one. */
  raw(name: string): string | null {
    return this.router.routerState.snapshot.root.queryParamMap.get(name);
  }

  follow(follower: Follower): () => void {
    this.followers.add(follower);
    return () => this.followers.delete(follower);
  }

  write(from: Follower, raw: string | null, replaceUrl: boolean): void {
    if (!this.isBrowser) return;
    this.replaceUrl = this.batch.size === 0 ? replaceUrl : this.replaceUrl && replaceUrl;
    this.batch.set(from.name, { from, raw });
    this.schedule();
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.flush();
    });
  }

  private flush(): void {
    // A navigation in flight is left to land; `settle()` flushes after it, onto
    // the address it produced. Navigating now would supersede it, and a link
    // the user clicked would be lost to a keystroke.
    if (this.batch.size === 0 || this.inFlight) return;
    const current = this.router.routerState.snapshot.root.queryParams;
    const queryParams: Params = {};
    let changed = false;
    for (const [name, { raw }] of this.batch) {
      queryParams[name] = raw;
      const was: unknown = current[name];
      if (raw !== (typeof was === 'string' ? was : was == null ? null : undefined)) changed = true;
    }
    const replaceUrl = this.replaceUrl;
    this.batch.clear();
    if (!changed) {
      // Two signals of one parameter can write opposite values in a task.
      this.settle();
      return;
    }
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge', preserveFragment: true, replaceUrl });
  }

  /** Every follower takes the address as it stands, except one with a write still to go. */
  private settle(): void {
    // A write that waited for the navigation which destroyed its signal belongs
    // to the page that navigation left, not to the address it produced.
    for (const [name, { from }] of this.batch) if (!this.followers.has(from)) this.batch.delete(name);
    for (const follower of this.followers) {
      if (this.batch.has(follower.name)) continue;
      const raw = this.raw(follower.name);
      if (raw === follower.raw) continue;
      follower.raw = raw;
      follower.write(follower.decode(raw));
    }
    if (this.batch.size > 0) this.schedule();
  }
}

/**
 * A writable signal linked to one query parameter.
 *
 * ```ts
 * readonly q = wrQueryParam('q');
 * readonly page = wrQueryParam<number>('page', { default: 1, parse: raw => Number(raw) || 1, serialize: String });
 * ```
 *
 * - **Reads** follow the address: Back, Forward and any navigation that
 *   changes the parameter move the signal. An absent parameter reads as
 *   `default`; a repeated one reads its first value.
 * - **Writes** are `set` and `update`, as on any signal. The signal takes the
 *   value at once, and one navigation per task carries every write made in
 *   it, across every `wrQueryParam` signal of the app. Other parameters and
 *   the fragment survive it. Writing `default` removes the parameter, and a
 *   write that changes nothing navigates nothing.
 * - **`replaceUrl`** is per signal. When writes with and without it meet in one
 *   task, the navigation pushes: a history entry replaced by mistake is lost,
 *   one pushed by mistake is one more Back.
 * - **A write during a navigation** waits for it, then lands on the address
 *   it produced. A navigation of this signal's own that is cancelled, fails
 *   or is superseded leaves the address as it was, and the signal reads it
 *   again: a lost write is read back, never kept.
 * - **A string needs no options.** Any other `T` needs `default`, `parse` and
 *   `serialize`. The address is user input: a `parse` that throws reads as
 *   `default`, and what else it cannot read is for it to decide.
 * - **Lifetime.** Needs an injection context and follows the address until that
 *   context is destroyed. A write already made is navigated all the same,
 *   unless it was waiting for the navigation that destroyed the context: the
 *   address that navigation produced belongs to another page.
 * - **On the server** it reads the parameter from the router, and a write
 *   moves the signal only; nothing navigates during prerender. Hydration
 *   navigates nothing either, since reading never does.
 *
 * Lives in `ngwr/utils/router`, since `@angular/router` is an optional peer.
 *
 * @param name - The parameter's name in the address.
 * @param options - `default` and `replaceUrl`, plus `parse` and `serialize` for a type other than `string`.
 * @returns The signal.
 */
export function wrQueryParam(name: string, options?: WrQueryParamStringOptions): WritableSignal<string>;
// eslint-disable-next-line no-redeclare -- an overload, so `T` is inferred from `parse`
export function wrQueryParam<T>(name: string, options: WrQueryParamOptions<T>): WritableSignal<T>;
// eslint-disable-next-line no-redeclare -- the implementation behind the two overloads
export function wrQueryParam<T>(
  name: string,
  options: WrQueryParamStringOptions | WrQueryParamOptions<T> = {}
): WritableSignal<T> {
  assertInInjectionContext(wrQueryParam);
  const params = inject(WrQueryParams);
  const typed = 'parse' in options ? options : null;
  const fallback = (typed ? typed.default : (options.default ?? '')) as T;
  const parse = typed ? typed.parse : (raw: string): T => raw as T;
  const serialize = typed ? typed.serialize : (value: T): string => value as string;
  const replaceUrl = options.replaceUrl ?? false;

  let fallbackRaw: string | undefined;
  try {
    fallbackRaw = serialize(fallback);
  } catch {
    fallbackRaw = undefined;
  }

  const decode = (raw: string | null): T => {
    if (raw === null) return fallback;
    try {
      return parse(raw);
    } catch {
      return fallback;
    }
  };
  const encode = (value: T): string | null => {
    if (Object.is(value, fallback)) return null;
    const raw = serialize(value);
    return raw === fallbackRaw ? null : raw;
  };

  const raw = params.raw(name);
  const sig = signal<T>(decode(raw));
  const write = sig.set.bind(sig);
  const follower: Follower = { name, raw, decode, write: write as (value: unknown) => void };

  sig.set = value => {
    const next = encode(value);
    follower.raw = next;
    write(value);
    params.write(follower, next, replaceUrl);
  };
  sig.update = fn => sig.set(fn(untracked(sig)));

  inject(DestroyRef).onDestroy(params.follow(follower));
  return sig;
}
