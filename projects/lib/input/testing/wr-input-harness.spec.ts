import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrInput } from 'ngwr/input';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInputHarness } from './wr-input-harness';

@Component({
  imports: [WrInput],
  template: `
    <input wrInput placeholder="Email" [value]="email()" (input)="onEmail($event)" />
    <textarea wrInput placeholder="Notes"></textarea>
    <input wrInput placeholder="Locked" [disabled]="true" />
  `,
})
class Host {
  readonly email = signal('');

  onEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }
}

describe('WrInputHarness', () => {
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

  it('finds both the input and the textarea the directive styles', async () => {
    const all = await loader.getAllHarnesses(WrInputHarness);

    expect(await Promise.all(all.map(i => i.getTagName()))).toEqual(['input', 'textarea', 'input']);
  });

  it('narrows by placeholder', async () => {
    const notes = await loader.getHarness(WrInputHarness.with({ placeholder: 'Notes' }));

    expect(await notes.getTagName()).toBe('textarea');
  });

  it('types a value in, and the host hears it', async () => {
    const email = await loader.getHarness(WrInputHarness.with({ placeholder: 'Email' }));
    await email.setValue('ada@example.test');

    expect(await email.getValue()).toBe('ada@example.test');
    expect(fixture.componentInstance.email()).toBe('ada@example.test');
  });

  it('clears a field it filled', async () => {
    const email = await loader.getHarness(WrInputHarness.with({ placeholder: 'Email' }));
    await email.setValue('draft');
    await email.clear();

    expect(await email.getValue()).toBe('');
    expect(fixture.componentInstance.email()).toBe('');
  });

  it('reports a disabled field, and narrows by it', async () => {
    const locked = await loader.getHarness(WrInputHarness.with({ placeholder: 'Locked' }));
    expect(await locked.isDisabled()).toBe(true);

    const disabled = await loader.getAllHarnesses(WrInputHarness.with({ disabled: true }));
    expect(await Promise.all(disabled.map(i => i.getPlaceholder()))).toEqual(['Locked']);
  });

  it('narrows by the value already in the field', async () => {
    const email = await loader.getHarness(WrInputHarness.with({ placeholder: 'Email' }));
    await email.setValue('found me');

    const found = await loader.getAllHarnesses(WrInputHarness.with({ value: 'found me' }));
    expect(found.length).toBe(1);
  });

  it('moves focus and lets go of it', async () => {
    const email = await loader.getHarness(WrInputHarness.with({ placeholder: 'Email' }));

    await email.focus();
    expect(await email.isFocused()).toBe(true);

    await email.blur();
    expect(await email.isFocused()).toBe(false);
  });
});
