import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../spec-sass';

import { WrForm, WrFormSpan } from './form';
import { WrFormField } from './form-field';

@Component({
  imports: [WrForm, WrFormField, WrFormSpan],
  template: `
    <form wrForm data-k="form" [inline]="inline()" [columns]="columns()">
      <wr-form-field label="First name"><input /></wr-form-field>
      <div data-k="plain">plain</div>
      <wr-form-field label="Email" data-k="span" [wrFormSpan]="span()"><input /></wr-form-field>
    </form>
    <form data-k="bare">
      <wr-form-field label="Name"><input /></wr-form-field>
    </form>
  `,
})
class Host {
  readonly inline = signal(false);
  readonly columns = signal<number | string>(1);
  readonly span = signal<number | string>('');
}

function setup(): { fixture: ComponentFixture<Host>; get: (key: string) => HTMLElement } {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, get: key => root.querySelector<HTMLElement>(`[data-k="${key}"]`)! };
}

describe('[wrForm]', () => {
  it('is a single column by default and leaves a form without it alone', () => {
    const { get } = setup();

    expect([...get('form').classList]).toEqual(['wr-form']);
    expect(get('form').style.getPropertyValue('--wr-form-columns')).toBe('1');
    expect(get('bare').className).toBe('');
    expect(get('bare').getAttribute('style')).toBeNull();
    expect(get('plain').className).toBe('');
  });

  it('marks the inline mode, which ignores columns', () => {
    const { fixture, get } = setup();

    fixture.componentInstance.inline.set(true);
    fixture.componentInstance.columns.set(3);
    fixture.detectChanges();

    expect([...get('form').classList].sort()).toEqual(['wr-form', 'wr-form--inline']);
  });

  it('carries the column count to the style', () => {
    const { fixture, get } = setup();

    fixture.componentInstance.columns.set(3);
    fixture.detectChanges();
    expect([...get('form').classList].sort()).toEqual(['wr-form', 'wr-form--columns']);
    expect(get('form').style.getPropertyValue('--wr-form-columns')).toBe('3');

    fixture.componentInstance.columns.set('2');
    fixture.detectChanges();
    expect(get('form').style.getPropertyValue('--wr-form-columns')).toBe('2');

    fixture.componentInstance.columns.set('none');
    fixture.detectChanges();
    expect([...get('form').classList]).toEqual(['wr-form']);
    expect(get('form').style.getPropertyValue('--wr-form-columns')).toBe('1');
  });
});

describe('[wrFormSpan]', () => {
  it('takes the whole row with no value and a number of columns with one', () => {
    const { fixture, get } = setup();

    expect(get('span').classList.contains('wr-form__span')).toBe(true);
    expect(get('span').style.getPropertyValue('--wr-form-span')).toBe('1 / -1');

    fixture.componentInstance.span.set(2);
    fixture.detectChanges();
    expect(get('span').style.getPropertyValue('--wr-form-span')).toBe('span 2');

    fixture.componentInstance.span.set('full');
    fixture.detectChanges();
    expect(get('span').style.getPropertyValue('--wr-form-span')).toBe('1 / -1');
  });
});

describe('the form layout sheet', { timeout: COMPILE_TIMEOUT }, () => {
  const css = compileSass(`@use 'form/styles';`).replace(/\s+/g, ' ');
  // A boolean, so a miss does not print the whole sheet.
  const has = (rule: string | RegExp): boolean => (typeof rule === 'string' ? css.includes(rule) : rule.test(css));

  it('reads the gap, the column count and the span from their hooks', () => {
    expect(has('--wr-form-gap: var(--wr-space-lg);')).toBe(true);
    expect(has('grid-template-columns: repeat(var(--wr-form-columns), minmax(0, 1fr));')).toBe(true);
    expect(has('gap: var(--wr-form-gap);')).toBe(true);
    expect(has('grid-column: var(--wr-form-span);')).toBe(true);
  });

  it('makes only the columns mode a query container', () => {
    expect(has(/\.wr-form--columns \{ container: wr-form ?\/ ?inline-size; width: 100%; \}/)).toBe(true);
    expect(css.match(/container:/g)).toHaveLength(1);
  });

  it('gives every field a full row once the form is narrow', () => {
    expect(
      has(/@container wr-form \(max-width: 30rem\) \{ \.wr-form--columns > \* \{ grid-column: 1 ?\/ ?-1; \} \}/)
    ).toBe(true);
  });
});
