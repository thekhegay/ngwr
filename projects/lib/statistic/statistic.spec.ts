import { Component, LOCALE_ID, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
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
  // `null`, the input's own default: the unit falls back to the catalog, then to
  // `'%'`. A host that binds `'%'` here would be an override, and would hide
  // every spec below that checks the fallback.
  readonly deltaSuffix = signal<string | null>(null);
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

/**
 * The delta, printed one line under a value that goes through `Intl`.
 *
 * `` `${sign}${d}${suffix}` `` put two number systems inside one component:
 * ar-SA rendered the value as `١٬٢٣٤٬٥٦٧٫٨٩` and the delta beside it as a Latin
 * `12.4%`, and de-DE `1.234.567,89` above `+12.4%`. The sign is `signDisplay`
 * rather than a hand-written `+` for the RTL half of the same defect — a bare
 * `+` is a neutral character the BiDi algorithm moves to the other end of the
 * number, which is why the screenshot in the audit reads `12.4%+`.
 */
describe('WrStatistic — the delta is localized', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const delta = (): string =>
    (fixture.nativeElement as HTMLElement).querySelector('.wr-statistic__delta')!.textContent.trim();

  const mount = async (providers: unknown[]): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.delta.set(12.4);
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('formats the number per LOCALE_ID, the way the value above it already did', async () => {
    await mount([{ provide: LOCALE_ID, useValue: 'de-DE' }]);

    fixture.componentInstance.value.set(1234567.89);
    fixture.componentInstance.precision.set(2);
    fixture.detectChanges();

    // A comma, because de-DE says so — not because anything about the delta
    // changed. The pair is the point: the value and the delta agree now.
    expect(delta()).toBe('+12,4%');
    expect((fixture.nativeElement as HTMLElement).querySelector('.wr-statistic__number')!.textContent.trim()).toBe(
      '1.234.567,89'
    );
  });

  it('writes the digits in the locale numbering system', async () => {
    await mount([{ provide: LOCALE_ID, useValue: 'ar-EG' }]);

    // Asserted as a PROPERTY rather than as a literal: `Intl` also emits an
    // Arabic letter mark around the sign here, and pinning the exact codepoints
    // would be pinning this Node's ICU rather than the component. What matters
    // is that no ASCII digit and no ASCII decimal point survives.
    expect(delta()).not.toMatch(/[0-9]/);
    expect(delta()).toMatch(/[٠-٩]/);
  });

  it('keeps every digit the consumer passed, not `precision()`', async () => {
    // `precision` describes the VALUE. A delta of 0.125 with `precision=2` must
    // not lose its third decimal to a rounding rule meant for the number above.
    await mount([]);
    fixture.componentInstance.precision.set(2);
    fixture.componentInstance.delta.set(0.125);
    fixture.detectChanges();

    expect(delta()).toBe('+0.125%');
  });

  it('takes its unit from the catalog when the consumer binds none', async () => {
    await mount([
      provideWrI18n({ defaultLocale: 'xx', availableLocales: ['xx'] }),
      provideWrI18nStaticLoader({ xx: { statistic: { deltaSuffix: ' п.п.' } } }),
    ]);

    expect(delta()).toBe('+12.4 п.п.');
  });

  it('lets a catalog put a space between the number and the unit', async () => {
    await mount([
      provideWrI18n({ defaultLocale: 'xx', availableLocales: ['xx'] }),
      provideWrI18nStaticLoader({ xx: { statistic: { delta: '{{value}} {{suffix}}' } } }),
    ]);

    expect(delta()).toBe('+12.4 %');
  });

  it('still lets a bound deltaSuffix win over the catalog', async () => {
    await mount([
      provideWrI18n({ defaultLocale: 'xx', availableLocales: ['xx'] }),
      provideWrI18nStaticLoader({ xx: { statistic: { deltaSuffix: ' п.п.' } } }),
    ]);
    fixture.componentInstance.deltaSuffix.set(' pts');
    fixture.detectChanges();

    expect(delta()).toBe('+12.4 pts');
  });
});
