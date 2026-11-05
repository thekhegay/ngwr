/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Signal, computed, signal } from '@angular/core';

/** Where a {@link WrAction} is: nothing ran yet, a run is in flight, or how the last one ended. */
export type WrActionStatus = 'idle' | 'pending' | 'success' | 'error';

/** One async write with its state as signals. Built by {@link wrAction}. */
export interface WrAction<A = void, R = void> {
  /** `idle` until the first run, `pending` while one is in flight, then `success` or `error`. */
  readonly status: Signal<WrActionStatus>;
  /** `true` while a run is in flight: `status() === 'pending'`. */
  readonly loading: Signal<boolean>;
  /** What the last successful run resolved with. Kept through a later run and a later failure; `undefined` until one succeeds and after `reset()`. */
  readonly value: Signal<R | undefined>;
  /** What the last run rejected with, or `undefined`. Cleared when a run starts and by `reset()`. */
  readonly error: Signal<unknown>;
  /**
   * Starts the write, or joins the one in flight.
   *
   * Single-flight: a call while a run is pending starts nothing and returns
   * that run's promise, so the caller still gets the result it would have
   * waited for, never a dropped one. The promise never rejects: it resolves
   * with the result, or with `undefined` when the call threw (read `error()`)
   * or when `reset()` ran before it settled.
   */
  run(arg: A): Promise<R | undefined>;
  /** Back to `idle`, with `value` and `error` cleared. A run still in flight is disowned: its result is dropped when it arrives. */
  reset(): void;
}

/**
 * Holds one async write, a save or a delete, as signals a template can read:
 * `status`, `loading`, the last `value` and the last `error`, with a
 * single-flight `run()` and a `reset()`.
 *
 * Needs no injection context, holds no DOM and registers nothing to clean up:
 * a result that lands after the owner is destroyed writes plain signals, which
 * nothing reads any more.
 *
 * @example
 * ```ts
 * readonly save = wrAction((draft: Draft) => this.api.save(draft));
 * ```
 * ```html
 * <button wr-btn [loading]="save.loading()" (click)="save.run(draft())">Save</button>
 * @if (save.status() === 'error') { <wr-alert type="danger">Could not save.</wr-alert> }
 * ```
 *
 * @param fn - The write. May throw synchronously; that counts as a rejection.
 * @returns The action, with `run()` and `reset()` bound so they can be passed around.
 */
export function wrAction<A = void, R = void>(fn: (arg: A) => Promise<R>): WrAction<A, R> {
  const status = signal<WrActionStatus>('idle');
  const value = signal<R | undefined>(undefined);
  const error = signal<unknown>(undefined);
  let flight: Promise<R | undefined> | null = null;
  // Bumped by reset(), so a run that started before it finds its result unwanted.
  let generation = 0;

  const run = (arg: A): Promise<R | undefined> => {
    if (flight) return flight;
    const mine = ++generation;
    status.set('pending');
    error.set(undefined);
    flight = new Promise<R>(resolve => resolve(fn(arg))).then(
      result => {
        if (mine !== generation) return undefined;
        flight = null;
        value.set(result);
        status.set('success');
        return result;
      },
      (reason: unknown) => {
        if (mine !== generation) return undefined;
        flight = null;
        error.set(reason);
        status.set('error');
        return undefined;
      }
    );
    return flight;
  };

  const reset = (): void => {
    generation++;
    flight = null;
    status.set('idle');
    value.set(undefined);
    error.set(undefined);
  };

  return { status, loading: computed(() => status() === 'pending'), value, error, run, reset };
}

/** The keyed form of {@link WrAction}: one write per key, each single-flight on its own. Built by {@link wrKeyedAction}. */
export interface WrKeyedAction<K, A = void, R = void> {
  /** `true` while `key` has a run in flight. Reactive: a template or a `computed()` re-reads it when the key settles. */
  pending(key: K): boolean;
  /** `true` while any key has a run in flight. */
  readonly loading: Signal<boolean>;
  /** What the most recently settled run rejected with, or `undefined` when it succeeded. Cleared by `reset()`. */
  readonly error: Signal<unknown>;
  /**
   * Starts the write for `key`, or joins the one in flight for that key.
   *
   * Single-flight per key: a second call for a pending key returns that run's
   * promise, while another key runs alongside. The promise never rejects: it
   * resolves with the result, or with `undefined` when the call threw (read
   * `error()`) or when `reset()` ran before it settled.
   */
  run(key: K, arg: A): Promise<R | undefined>;
  /** Forgets every pending key and clears `error`. Runs still in flight are disowned: their results are dropped when they arrive. */
  reset(): void;
}

/**
 * The row form of {@link wrAction}: the same write across many keys, a row id
 * say, so a list can show which rows are busy while one row cannot run twice.
 * A key is kept only while it is pending, so the state stays as small as the
 * number of runs in flight.
 *
 * Needs no injection context, like `wrAction`.
 *
 * @example
 * ```ts
 * readonly remove = wrKeyedAction((id: string) => this.api.remove(id));
 * ```
 * ```html
 * @for (row of rows(); track row.id) {
 *   <button wr-btn [loading]="remove.pending(row.id)" (click)="remove.run(row.id)">Remove</button>
 * }
 * ```
 *
 * @param fn - The write. Gets the key and the argument `run()` was called with. May throw synchronously; that counts as a rejection.
 * @returns The keyed action, with its methods bound so they can be passed around.
 */
export function wrKeyedAction<K, A = void, R = void>(fn: (key: K, arg: A) => Promise<R>): WrKeyedAction<K, A, R> {
  const keys = signal<ReadonlySet<K>>(new Set());
  const error = signal<unknown>(undefined);
  const flights = new Map<K, Promise<R | undefined>>();
  let generation = 0;

  const drop = (key: K): void => {
    flights.delete(key);
    keys.update(set => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
  };

  const run = (key: K, arg: A): Promise<R | undefined> => {
    const live = flights.get(key);
    if (live) return live;
    const mine = generation;
    keys.update(set => new Set(set).add(key));
    const flight = new Promise<R>(resolve => resolve(fn(key, arg))).then(
      result => {
        if (mine !== generation) return undefined;
        drop(key);
        error.set(undefined);
        return result;
      },
      (reason: unknown) => {
        if (mine !== generation) return undefined;
        drop(key);
        error.set(reason);
        return undefined;
      }
    );
    flights.set(key, flight);
    return flight;
  };

  const reset = (): void => {
    generation++;
    flights.clear();
    keys.set(new Set());
    error.set(undefined);
  };

  return {
    pending: (key: K) => keys().has(key),
    loading: computed(() => keys().size > 0),
    error,
    run,
    reset,
  };
}
