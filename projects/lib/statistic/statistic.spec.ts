import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrStatistic } from './statistic';
import { WrStatisticGroup } from './statistic-group';

@Component({
  imports: [WrStatistic],
  template: `
    <wr-statistic
      [label]="label()"
      [value]="value()"
      [prefix]="prefix()"
      [suffix]="suffix()"
      [precision]="precision()"
      [delta]="delta()"
      [deltaSuffix]="deltaSuffix()"
      [animate]="animate()"
    />
  `,
})
class Host {
  readonly label = signal('Active users');
  readonly value = signal<number | string | null>(12345);
  readonly prefix = signal('');
  readonly suffix = signal('');
  readonly precision = signal(0);
  readonly delta = signal<number | null>(null);
  readonly deltaSuffix = signal('%');
  readonly animate = signal(false);
}

/** A platform whose only interesting property is that motion is unwelcome. */
const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: signal(false).asReadonly(),
  prefersReducedMotion: signal(true).asReadonly(),
};

/**
 * The animated path is `wr-count-up`'s business (covered in `counter.spec.ts`),
 * so what is pinned here is the STATIC rendering — which is what SSR, reduced
 * motion and `[animate]="false"` all produce, and therefore what most consumers
 * see in the prerendered HTML.
 */
describe('WrStatistic', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (selector: string): string | null => root().querySelector(selector)?.textContent?.trim() ?? null;
  const number = (): string | null => text('.wr-statistic__number');
  const delta = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-statistic__delta');

  const mount = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => mount());
  afterEach(() => fixture.destroy());

  it('renders the label and the grouped number', () => {
    expect(text('.wr-statistic__label')).toBe('Active users');
    expect(number()).toBe('12,345');
  });

  it('drops the label element when there is no label', () => {
    fixture.componentInstance.label.set('');
    fixture.detectChanges();

    expect(root().querySelector('.wr-statistic__label')).toBeNull();
  });

  it('applies the precision it was given', () => {
    fixture.componentInstance.value.set(1.849);
    fixture.componentInstance.precision.set(1);
    fixture.detectChanges();

    expect(number()).toBe('1.8');
  });

  it('renders the prefix and suffix around the number, only when set', () => {
    expect(root().querySelector('.wr-statistic__prefix')).toBeNull();
    expect(root().querySelector('.wr-statistic__suffix')).toBeNull();

    fixture.componentInstance.prefix.set('$');
    fixture.componentInstance.suffix.set('USD');
    fixture.detectChanges();

    expect(text('.wr-statistic__prefix')).toBe('$');
    expect(text('.wr-statistic__suffix')).toBe('USD');
  });

  it('renders a non-numeric value verbatim', () => {
    fixture.componentInstance.value.set('N/A');
    fixture.detectChanges();

    expect(number()).toBe('N/A');
  });

  it('shows the placeholder for every kind of missing value', () => {
    // `''` was rendered verbatim, so an empty string from an API left a labelled
    // card with nothing under it — while the numeric path already treated `''`
    // as "no value".
    for (const empty of [null, ''] as const) {
      fixture.componentInstance.value.set(empty);
      fixture.detectChanges();
      expect(number()).toBe('—');
    }
  });

  it('reads a numeric string as a number', () => {
    fixture.componentInstance.value.set('12345');
    fixture.detectChanges();

    expect(number()).toBe('12,345');
  });

  it('shows a signed delta with a direction class', () => {
    fixture.componentInstance.delta.set(12.4);
    fixture.detectChanges();
    expect(delta()!.textContent.trim()).toBe('+12.4%');
    expect(delta()!.className).toContain('wr-statistic__delta--up');

    fixture.componentInstance.delta.set(-0.4);
    fixture.detectChanges();
    expect(delta()!.textContent.trim()).toBe('-0.4%');
    expect(delta()!.className).toContain('wr-statistic__delta--down');
  });

  it('calls a zero delta flat, with no arrow', () => {
    fixture.componentInstance.delta.set(0);
    fixture.detectChanges();

    expect(delta()!.className).toContain('wr-statistic__delta--flat');
    expect(delta()!.querySelector('svg')).toBeNull();
  });

  it('keeps the arrow out of the accessible tree, because the sign is the direction', () => {
    fixture.componentInstance.delta.set(5);
    fixture.detectChanges();

    expect(delta()!.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('takes the delta unit from the consumer', () => {
    fixture.componentInstance.delta.set(3);
    fixture.componentInstance.deltaSuffix.set(' pts');
    fixture.detectChanges();

    expect(delta()!.textContent.trim()).toBe('+3 pts');
  });

  it('drops the delta entirely when it is absent or unparsable', () => {
    expect(delta()).toBeNull();

    fixture.componentInstance.delta.set(Number.NaN);
    fixture.detectChanges();
    expect(delta()).toBeNull();
  });

  it('counts up in a browser that allows motion', () => {
    fixture.componentInstance.animate.set(true);
    fixture.detectChanges();

    expect(root().querySelector('wr-count-up')).not.toBeNull();
  });

  it('renders the final number instead of counting for someone who asked for less motion', () => {
    mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    fixture.componentInstance.animate.set(true);
    fixture.detectChanges();

    expect(root().querySelector('wr-count-up')).toBeNull();
    expect(number()).toBe('12,345');
  });

  it('renders the final number on the server', () => {
    mount([{ provide: PLATFORM_ID, useValue: 'server' }]);
    fixture.componentInstance.animate.set(true);
    fixture.detectChanges();

    expect(root().querySelector('wr-count-up')).toBeNull();
    expect(number()).toBe('12,345');
  });
});

@Component({
  imports: [WrStatisticGroup],
  template: `<wr-statistic-group [min]="min()" [columns]="columns()">card</wr-statistic-group>`,
})
class GroupHost {
  readonly min = signal('12rem');
  readonly columns = signal(0);
}

describe('WrStatisticGroup', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<GroupHost>>;

  const group = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-statistic-group')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('drives the grid through custom properties, uncapped by default', () => {
    // The column count is a CSS problem, so the component's whole job is to put
    // these two values on the host — `0` columns must leave the cap unset
    // rather than write `0`, which would collapse the grid.
    expect(group().style.getPropertyValue('--wr-statistic-group-min')).toBe('12rem');
    expect(group().style.getPropertyValue('--wr-statistic-group-columns')).toBe('');
  });

  it('caps the columns when asked', () => {
    fixture.componentInstance.min.set('8rem');
    fixture.componentInstance.columns.set(4);
    fixture.detectChanges();

    expect(group().style.getPropertyValue('--wr-statistic-group-min')).toBe('8rem');
    expect(group().style.getPropertyValue('--wr-statistic-group-columns')).toBe('4');
  });

  it('projects its cards into the grid', () => {
    expect(group().querySelector('.wr-statistic-group__grid')!.textContent).toContain('card');
  });
});
