import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrBurger } from 'ngwr/burger';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBurgerHarness } from './wr-burger-harness';

@Component({
  imports: [WrBurger],
  template: `
    <wr-burger [(open)]="open" [label]="label()" [disabled]="disabled()" />
    <wr-burger label="Filters" [open]="true" />
  `,
})
class Host {
  readonly open = signal(false);
  readonly label = signal<string | null>(null);
  readonly disabled = signal(false);
}

describe('WrBurgerHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the label, the default and a bound one', async () => {
    const burger = await loader.getHarness(WrBurgerHarness);
    expect(await burger.getLabel()).toBe('Toggle menu');

    fixture.componentInstance.label.set('Main menu');
    await fixture.whenStable();

    expect(await burger.getLabel()).toBe('Main menu');
  });

  it('opens and closes through the button, and writes it back to the host', async () => {
    const burger = await loader.getHarness(WrBurgerHarness);
    expect(await burger.isOpen()).toBe(false);

    await burger.open();
    await burger.open();
    expect([await burger.isOpen(), fixture.componentInstance.open()]).toEqual([true, true]);

    await burger.close();
    await burger.close();
    expect([await burger.isOpen(), fixture.componentInstance.open()]).toEqual([false, false]);

    await burger.toggle();
    expect(await burger.isOpen()).toBe(true);
  });

  it('believes the button over the host class when the two disagree', async () => {
    const burger = await loader.getHarness(WrBurgerHarness);
    await burger.open();

    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-burger')!;
    host.querySelector('button')!.setAttribute('aria-expanded', 'false');

    // The class drives the morph; the attribute is what a screen reader is told.
    expect(host.classList.contains('wr-burger--opened')).toBe(true);
    expect(await burger.isOpen()).toBe(false);
  });

  it('reports a disabled toggle and refuses to move it', async () => {
    const burger = await loader.getHarness(WrBurgerHarness);
    expect(await burger.isDisabled()).toBe(false);

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await burger.isDisabled()).toBe(true);
    await burger.toggle();
    expect(await burger.isOpen()).toBe(false);
    await expect(burger.open()).rejects.toThrow(/did not open/);

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    await expect(burger.close()).rejects.toThrow(/did not close/);
  });

  it('moves focus to the button and reports it', async () => {
    const burger = await loader.getHarness(WrBurgerHarness);
    expect(await burger.isFocused()).toBe(false);

    await burger.focus();

    expect(await burger.isFocused()).toBe(true);
  });

  it('narrows by label, open and disabled', async () => {
    const labels = async (filters: Parameters<typeof WrBurgerHarness.with>[0]): Promise<(string | null)[]> =>
      Promise.all((await loader.getAllHarnesses(WrBurgerHarness.with(filters))).map(burger => burger.getLabel()));

    expect(await labels({ label: /^Filters$/ })).toEqual(['Filters']);
    expect(await labels({ open: true })).toEqual(['Filters']);
    expect(await labels({ open: false })).toEqual(['Toggle menu']);
    expect(await labels({ disabled: false })).toEqual(['Toggle menu', 'Filters']);
    expect(await labels({ disabled: true })).toEqual([]);
  });
});
