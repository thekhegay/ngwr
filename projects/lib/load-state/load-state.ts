/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  type Resource,
  ViewEncapsulation,
  type WritableResource,
  computed,
  contentChild,
  input,
  linkedSignal,
  output,
} from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrEmpty } from 'ngwr/empty';
import { useI18nText } from 'ngwr/i18n';
import { WrResult } from 'ngwr/result';
import { WrSkeleton } from 'ngwr/skeleton';
import { wrNumAttr, type WrSafeAny, wrCheckStyles } from 'ngwr/utils';

import { WrLoadStateContent, WrLoadStateEmpty, WrLoadStateError, WrLoadStateLoading } from './load-state-templates';
import type { WrLoadStateContentContext, WrLoadStateErrorContext, WrLoadStateStatus } from './types';

/** The default `isEmpty`: nothing, or a list with nothing in it. */
const isEmptyValue = (value: unknown): boolean => value == null || (Array.isArray(value) && value.length === 0);

/**
 * One wrapper for the four states of a screen that loads: the skeleton, the
 * failure with a retry, the empty slot and the content. Give it a `resource`
 * and it reads the state from there; give it a `status` and the app decides.
 * Never both.
 *
 * The content and any custom part are templates, so nothing of the content is
 * created before it is ready. The defaults are `<wr-skeleton [lines]>`,
 * `<wr-result status="error">` with a retry button, and `<wr-empty>`, so the
 * minimal use is the resource and a content template.
 *
 * What each resource status draws:
 *
 * | `resource.status()`   | Drawn                                                                 |
 * | --------------------- | --------------------------------------------------------------------- |
 * | `loading`             | the skeleton                                                          |
 * | `reloading`           | what was on screen, marked busy; the failure, with its button busy, after a failed load; the skeleton when there is no value yet |
 * | `error`               | the failure                                                           |
 * | `resolved`, `local`   | the empty slot when `isEmpty(value)`, else the content                |
 * | `idle`                | the content or the empty slot by `isEmpty`: nothing was asked for, so nothing loads |
 *
 * Accessibility: the host carries `aria-busy` while a load is in flight, the
 * failure's title is announced once through a polite live region, nothing is
 * announced for a reload that keeps the content, and focus is never moved.
 *
 * @example
 * ```html
 * <wr-load-state [resource]="users">
 *   <ng-template wrLoadStateContent [wrLoadStateContentOf]="users" let-users>
 *     <wr-table [items]="users" [columns]="columns" />
 *   </ng-template>
 * </wr-load-state>
 *
 * <wr-load-state [status]="status()" (retry)="load()">
 *   <ng-template wrLoadStateContent>{{ text() }}</ng-template>
 * </wr-load-state>
 * ```
 *
 * @see https://ngwr.dev/reference/components/load-state
 */
@Component({
  selector: 'wr-load-state',
  templateUrl: './load-state.html',
  imports: [NgTemplateOutlet, WrSkeleton, WrResult, WrEmpty, WrButton],
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'busy() ? "true" : null',
  },
})
export class WrLoadState<T = WrSafeAny> {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('load-state');
  }

  /**
   * The state, when the app decides it. Ignored while `resource` is set.
   *
   * @default null
   */
  readonly status = input<WrLoadStateStatus | null>(null);

  /**
   * The resource to read the state from: `resource()`, `rxResource()` and
   * `httpResource()` alike. The retry button calls its `reload()`.
   *
   * @default null
   */
  readonly resource = input<Resource<T | undefined> | null>(null);

  /**
   * Decides whether a settled value shows the empty slot instead of the content.
   * The default is empty for `null`, `undefined` and an empty array.
   *
   * @default isEmptyValue
   */
  readonly isEmpty = input<(value: T | undefined) => boolean>(isEmptyValue);

  /**
   * How many lines the default skeleton draws.
   *
   * @default 3
   */
  readonly lines = input(3, { transform: wrNumAttr(3) });

  /** The failure's title. Falls back to `loadState.failed`, then `'Could not load'`. */
  readonly errorLabel = input<string | null>(null);

  /** The retry button's label. Falls back to `loadState.retry`, then `'Try again'`. */
  readonly retryLabel = input<string | null>(null);

  /** The default empty slot's title. Falls back to `empty.noData` through `<wr-empty>`. */
  readonly emptyLabel = input<string | null>(null);

  /**
   * Emitted when the retry button is pressed, once per press that starts a
   * retry. With a `resource`, `reload()` has been called as well.
   */
  readonly retry = output<void>();

  protected readonly resolvedErrorLabel = useI18nText(this.errorLabel, 'loadState.failed', 'Could not load');
  protected readonly resolvedRetryLabel = useI18nText(this.retryLabel, 'loadState.retry', 'Try again');

  protected readonly contentTpl = contentChild<WrLoadStateContent<T>>(WrLoadStateContent);
  protected readonly loadingTpl = contentChild(WrLoadStateLoading);
  protected readonly errorTpl = contentChild(WrLoadStateError);
  protected readonly emptyTpl = contentChild(WrLoadStateEmpty);

  protected readonly state = computed<WrLoadStateStatus>(() => {
    const resource = this.resource();
    if (!resource) return this.status() ?? 'loading';
    const status = resource.status();
    if (status === 'loading') return 'loading';
    if (status === 'error') return 'error';
    const held = resource.hasValue();
    if (status === 'reloading' && !held) return resource.error() !== undefined ? 'error' : 'loading';
    return this.isEmpty()(held ? resource.value() : undefined) ? 'empty' : 'ready';
  });

  /** A load is in flight: the first one, or a reload behind whatever is on screen. */
  protected readonly busy = computed(() => {
    const resource = this.resource();
    return resource ? resource.isLoading() : this.state() === 'loading';
  });

  /**
   * A press that has not reached the resource's status yet. `reload()` flips the
   * status in the same tick, so with a resource this covers only the gap before
   * it; with a `status` it holds until the app answers the `retry` output.
   */
  private readonly pressed = linkedSignal({
    source: () => [this.status(), this.resource()?.status()],
    computation: () => false,
  });

  protected readonly retrying = computed(() => this.pressed() || (this.resource()?.isLoading() ?? false));

  protected readonly classes = computed(() => {
    const parts = ['wr-load-state', `wr-load-state--${this.state()}`];
    if (this.busy()) parts.push('wr-load-state--busy');
    return parts.join(' ');
  });

  protected readonly contentContext = computed<WrLoadStateContentContext<T | undefined>>(() => {
    const resource = this.resource();
    return {
      $implicit: resource?.hasValue() ? resource.value() : undefined,
      reloading: this.busy(),
    };
  });

  protected readonly errorContext = computed<WrLoadStateErrorContext>(() => ({
    $implicit: this.resource()?.error(),
    retry: () => this.onRetry(),
    retrying: this.retrying(),
  }));

  /** A second press while one is in flight starts nothing. */
  protected onRetry(): void {
    if (this.retrying()) return;
    this.pressed.set(true);
    this.retry.emit();
    (this.resource() as Partial<WritableResource<T | undefined>> | null)?.reload?.();
  }
}
