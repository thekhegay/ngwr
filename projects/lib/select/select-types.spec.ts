import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrOption } from './option';
import { WrSelect } from './select';

/**
 * `V` when it is a real type, a required extra argument nothing can supply when
 * it is `any`: only `any` satisfies `0 extends 1 & V`. The same probe
 * `table-columns.spec.ts` uses, since a template has no `@ts-expect-error`.
 */
type NotAny<V> = 0 extends 1 & V ? [never] : [];

interface Country {
  code: string;
  name: string;
}

const COUNTRIES: readonly Country[] = [
  { code: 'kz', name: 'Kazakhstan' },
  { code: 'de', name: 'Germany' },
];

/**
 * `strictTemplates` type-checks this host, which is the spec: `T` comes from
 * `[options]`, so `displayWith` takes a `Country` and `valueChange` carries one
 * (or an array of them, or `null`), and the value bound two-way stays the
 * signal's own type in single and multi mode alike.
 */
@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select placeholder="Pick a size" ariaLabel="Size" [(value)]="size" (valueChange)="expectSize($event)">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
    </wr-select>
    <wr-select mode="multi" ariaLabel="Tags" [(value)]="tags">
      <wr-option value="ts">TypeScript</wr-option>
      <wr-option value="ng">Angular</wr-option>
    </wr-select>
    <wr-select
      mode="search"
      ariaLabel="Country"
      [options]="countries"
      [displayWith]="countryName"
      [(value)]="country"
      (valueChange)="expectCountry($event)"
    />
  `,
})
class TypedHost {
  readonly size = signal<string | null>('md');
  readonly tags = signal<readonly string[]>(['ts']);
  readonly countries = COUNTRIES;
  readonly country = signal<Country | null>(null);
  readonly countryName = (country: Country): string => country.name;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a probe's parameters exist to be typed, never read
  expectSize<V extends string | readonly string[] | null>(_value: V, ..._rest: NotAny<V>): void {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a probe's parameters exist to be typed, never read
  expectCountry<V extends Country | readonly Country[] | null>(_value: V, ..._rest: NotAny<V>): void {
    return;
  }
}

describe('WrSelect typed value', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TypedHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const selects = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('wr-select')];
  const label = (at: number): string | undefined =>
    selects()[at].querySelector('.wr-select__value')?.textContent?.trim();
  const chips = (at: number): string[] =>
    [...selects()[at].querySelectorAll<HTMLElement>('.wr-select__chip-label')].map(c => c.textContent.trim());

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TypedHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the single value the typed signal holds', () => {
    expect(label(0)).toBe('Medium');
    fixture.componentInstance.size.set('sm');
    fixture.detectChanges();
    expect(label(0)).toBe('Small');
  });

  it('shows the chips the typed array holds', () => {
    expect(chips(1)).toEqual(['TypeScript']);
    fixture.componentInstance.tags.set(['ts', 'ng']);
    fixture.detectChanges();
    expect(chips(1)).toEqual(['TypeScript', 'Angular']);
  });

  it('labels a typed option through a displayWith written for that type', () => {
    fixture.componentInstance.country.set(COUNTRIES[1]);
    fixture.detectChanges();
    const input = selects()[2].querySelector<HTMLInputElement>('input');
    expect(input?.value).toBe('Germany');
  });
});
