import { Component, resource, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrLoadState } from './load-state';
import { WrLoadStateContent, WrLoadStateEmpty, WrLoadStateError, WrLoadStateLoading } from './load-state-templates';
import type { WrLoadStateStatus } from './types';

/** One load the spec settles by hand. */
interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

@Component({
  imports: [WrLoadState, WrLoadStateContent],
  template: `
    <wr-load-state [status]="status()" (retry)="retries.set(retries() + 1)">
      <ng-template wrLoadStateContent>
        <p class="content">{{ created() }}</p>
      </ng-template>
    </wr-load-state>
  `,
})
class StatusHost {
  readonly status = signal<WrLoadStateStatus>('loading');
  readonly retries = signal(0);
  /** Bumped by the content template alone, so a count above zero means it was instantiated. */
  creations = 0;

  created(): string {
    this.creations++;
    return 'Loaded';
  }
}

@Component({
  imports: [WrLoadState, WrLoadStateContent],
  template: `
    <wr-load-state [resource]="rows" [isEmpty]="isEmpty()" (retry)="retries.set(retries() + 1)">
      <ng-template wrLoadStateContent [wrLoadStateContentOf]="rows" let-rows let-reloading="reloading">
        <ul class="content" [class.content--reloading]="reloading">
          @for (row of rows; track row) {
            <li>{{ row }}</li>
          }
        </ul>
      </ng-template>
    </wr-load-state>
  `,
})
class ResourceHost {
  readonly page = signal<number | undefined>(1);
  readonly retries = signal(0);
  readonly isEmpty = signal<(value: readonly string[] | undefined) => boolean>(v => v == null || v.length === 0);
  /** Every load, in order; the spec settles each one. */
  readonly loads: Deferred<readonly string[]>[] = [];

  readonly rows = resource<readonly string[], number | undefined>({
    params: () => this.page(),
    loader: () => {
      const load = deferred<readonly string[]>();
      this.loads.push(load);
      return load.promise;
    },
  });
}

@Component({
  imports: [WrLoadState, WrLoadStateContent, WrLoadStateLoading, WrLoadStateError, WrLoadStateEmpty],
  template: `
    <wr-load-state [status]="status()">
      <ng-template wrLoadStateLoading><p class="my-loading">Fetching</p></ng-template>
      <ng-template wrLoadStateError let-error let-retry="retry" let-retrying="retrying">
        <p class="my-error">{{ error?.message ?? 'no error' }} {{ retrying ? 'retrying' : 'idle' }}</p>
        <button type="button" class="my-retry" (click)="retry()">Again</button>
      </ng-template>
      <ng-template wrLoadStateEmpty><p class="my-empty">Nothing yet</p></ng-template>
      <ng-template wrLoadStateContent><p class="content">Loaded</p></ng-template>
    </wr-load-state>
  `,
})
class TemplatesHost {
  readonly status = signal<WrLoadStateStatus>('loading');
}

const text = (root: HTMLElement, selector: string): string | null =>
  root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;

/** Sorted class set: DOM class order is the binding's diff order, not the order the component wrote. */
const classesOf = (el: HTMLElement): string[] => [...el.classList].sort();

/**
 * A macrotask, so a settled load's `.then` chain has run. Not `whenStable()`:
 * that waits for the resource's pending task, which an unsettled load holds open.
 */
const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

/**
 * The wrapper draws one of four things and announces one of them. The spec
 * reads the rendered DOM: the `.wr-load-state--<state>` modifier, `aria-busy`,
 * the live region and which default or template is on screen. The content
 * template is the one that must NOT exist before its time, which is why the
 * status host counts how often it was drawn.
 */
describe('WrLoadState driven by a status', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<StatusHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-load-state')!;
  const announce = (): string => text(root(), '.wr-load-state__announce') ?? '';
  const retryButton = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-load-state__retry');

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(StatusHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('draws the skeleton, marked busy, and keeps the content uncreated', () => {
    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--busy', 'wr-load-state--loading']);
    expect(host().getAttribute('aria-busy')).toBe('true');
    expect(root().querySelectorAll('.wr-load-state__skeleton .wr-skeleton__line').length).toBe(3);
    expect(root().querySelector('.content')).toBeNull();
    expect(fixture.componentInstance.creations).toBe(0);
    expect(announce()).toBe('');
  });

  it('draws the failure with a retry, and announces it once', () => {
    fixture.componentInstance.status.set('error');
    fixture.detectChanges();

    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--error']);
    expect(host().getAttribute('aria-busy')).toBeNull();
    expect(root().querySelector('.wr-load-state__error.wr-result--error')).not.toBeNull();
    expect(text(root(), '.wr-result__title')).toBe('Could not load');
    expect(text(root(), '.wr-load-state__retry')).toBe('Try again');
    expect(announce()).toBe('Could not load');

    const region = root().querySelector('.wr-load-state__announce')!;
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');

    // A render with nothing changed leaves the region's text node alone.
    const node = region.firstChild;
    fixture.detectChanges();
    expect(region.firstChild).toBe(node);
  });

  it('emits retry once for a double press, and disables the button until the status moves', () => {
    fixture.componentInstance.status.set('error');
    fixture.detectChanges();

    retryButton()!.click();
    retryButton()!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.retries()).toBe(1);
    expect(retryButton()!.classList.contains('wr-btn--loading')).toBe(true);
    // The text left the live region with the press, so the next failure is announced too.
    expect(announce()).toBe('');

    fixture.componentInstance.status.set('loading');
    fixture.detectChanges();
    fixture.componentInstance.status.set('error');
    fixture.detectChanges();

    expect(retryButton()!.classList.contains('wr-btn--loading')).toBe(false);
    expect(announce()).toBe('Could not load');
  });

  it('draws the empty slot', () => {
    fixture.componentInstance.status.set('empty');
    fixture.detectChanges();

    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--empty']);
    expect(text(root(), '.wr-load-state__empty .wr-empty__title')).toBe('No data');
    expect(fixture.componentInstance.creations).toBe(0);
  });

  it('creates the content only once ready', () => {
    fixture.componentInstance.status.set('ready');
    fixture.detectChanges();

    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--ready']);
    expect(text(root(), '.content')).toBe('Loaded');
    expect(fixture.componentInstance.creations).toBeGreaterThan(0);
    expect(root().querySelector('.wr-skeleton')).toBeNull();
    expect(announce()).toBe('');
  });
});

describe('WrLoadState driven by a resource', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ResourceHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-load-state')!;
  const announce = (): string => text(root(), '.wr-load-state__announce') ?? '';
  const retryButton = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-load-state__retry');
  const loads = (): Deferred<readonly string[]>[] => fixture.componentInstance.loads;

  /** Settle the latest load and let the resource land it. */
  const settle = async (rows: readonly string[]): Promise<void> => {
    loads().at(-1)!.resolve(rows);
    await tick();
    fixture.detectChanges();
  };
  const fail = async (): Promise<void> => {
    loads().at(-1)!.reject(new Error('offline'));
    await tick();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ResourceHost);
    fixture.detectChanges();
    await tick();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the skeleton for the first load', () => {
    expect(loads().length).toBe(1);
    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--busy', 'wr-load-state--loading']);
    expect(host().getAttribute('aria-busy')).toBe('true');
    expect(root().querySelector('.wr-skeleton')).not.toBeNull();
    expect(root().querySelector('.content')).toBeNull();
  });

  it('hands the value to the content template', async () => {
    await settle(['a', 'b']);

    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--ready']);
    expect(host().getAttribute('aria-busy')).toBeNull();
    expect([...root().querySelectorAll('.content li')].map(li => li.textContent)).toEqual(['a', 'b']);
    expect(announce()).toBe('');
  });

  it('shows the empty slot, not the skeleton, for a resource that was asked for nothing', async () => {
    fixture.componentInstance.page.set(undefined);
    fixture.detectChanges();
    await tick();
    fixture.detectChanges();

    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--empty']);
    expect(host().getAttribute('aria-busy')).toBeNull();
    expect(root().querySelector('.wr-skeleton')).toBeNull();
  });

  it('shows the empty slot for an empty array, and the content once the predicate says otherwise', async () => {
    await settle([]);

    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--empty']);
    expect(root().querySelector('.wr-load-state__empty')).not.toBeNull();

    fixture.componentInstance.isEmpty.set(() => false);
    fixture.detectChanges();

    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--ready']);
    expect(root().querySelector('.content')).not.toBeNull();
  });

  it('keeps the content on screen through a reload, busy and silent', async () => {
    await settle(['a']);
    const content = root().querySelector('.content')!;

    fixture.componentInstance.rows.reload();
    fixture.detectChanges();

    expect(loads().length).toBe(2);
    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--busy', 'wr-load-state--ready']);
    expect(host().getAttribute('aria-busy')).toBe('true');
    expect(root().querySelector('.content')).toBe(content);
    expect(content.classList.contains('content--reloading')).toBe(true);
    expect(root().querySelector('.wr-skeleton')).toBeNull();
    expect(announce()).toBe('');

    await settle(['a', 'b']);
    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--ready']);
    expect(content.classList.contains('content--reloading')).toBe(false);
  });

  it('shows the skeleton again when the params change', async () => {
    await settle(['a']);

    fixture.componentInstance.page.set(2);
    fixture.detectChanges();
    await tick();
    fixture.detectChanges();

    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--busy', 'wr-load-state--loading']);
    expect(root().querySelector('.content')).toBeNull();
  });

  it('draws the failure, retries through reload() once per press, and announces each failure', async () => {
    await fail();

    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--error']);
    expect(text(root(), '.wr-result__title')).toBe('Could not load');
    expect(announce()).toBe('Could not load');

    retryButton()!.click();
    retryButton()!.click();
    fixture.detectChanges();

    // The failure stays up while the retry runs, with its button busy.
    expect(fixture.componentInstance.retries()).toBe(1);
    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--busy', 'wr-load-state--error']);
    expect(retryButton()!.classList.contains('wr-btn--loading')).toBe(true);
    expect(root().querySelector('.wr-skeleton')).toBeNull();
    expect(announce()).toBe('');

    await tick();
    fixture.detectChanges();
    expect(loads().length).toBe(2);

    await fail();
    expect(retryButton()!.classList.contains('wr-btn--loading')).toBe(false);
    expect(announce()).toBe('Could not load');

    retryButton()!.click();
    await tick();
    fixture.detectChanges();
    await settle(['a']);
    expect(classesOf(host())).toEqual(['wr-load-state', 'wr-load-state--ready']);
    expect(announce()).toBe('');
  });
});

describe('WrLoadState with custom templates', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TemplatesHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TemplatesHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('draws each template in place of the default', () => {
    expect(text(root(), '.my-loading')).toBe('Fetching');
    expect(root().querySelector('.wr-skeleton')).toBeNull();

    fixture.componentInstance.status.set('error');
    fixture.detectChanges();
    expect(text(root(), '.my-error')).toBe('no error idle');
    expect(root().querySelector('.wr-result')).toBeNull();
    // The generic title is still announced: the library ships no other copy.
    expect(text(root(), '.wr-load-state__announce')).toBe('Could not load');

    fixture.componentInstance.status.set('empty');
    fixture.detectChanges();
    expect(text(root(), '.my-empty')).toBe('Nothing yet');
    expect(root().querySelector('.wr-empty')).toBeNull();

    fixture.componentInstance.status.set('ready');
    fixture.detectChanges();
    expect(text(root(), '.content')).toBe('Loaded');
  });

  it('gives the error template a retry that arms once', () => {
    fixture.componentInstance.status.set('error');
    fixture.detectChanges();

    root().querySelector<HTMLElement>('.my-retry')!.click();
    fixture.detectChanges();

    expect(text(root(), '.my-error')).toBe('no error retrying');
  });
});

describe('WrLoadState labels', () => {
  @Component({
    imports: [WrLoadState],
    template: `
      <wr-load-state [status]="status()" errorLabel="Sync broke" retryLabel="Once more" emptyLabel="Nothing here" />
    `,
  })
  class LabelsHost {
    readonly status = signal<WrLoadStateStatus>('error');
  }

  it('takes the host labels over the catalog', () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(LabelsHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(text(root, '.wr-result__title')).toBe('Sync broke');
    expect(text(root, '.wr-load-state__retry')).toBe('Once more');
    expect(text(root, '.wr-load-state__announce')).toBe('Sync broke');

    fixture.componentInstance.status.set('empty');
    fixture.detectChanges();
    expect(text(root, '.wr-empty__title')).toBe('Nothing here');
    fixture.destroy();
  });
});
