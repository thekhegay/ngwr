import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCopyValue } from 'ngwr/copy-value';
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCopyValueHarness } from './wr-copy-value-harness';

@Component({
  imports: [WrCopyValue],
  template: `
    <wr-copy-value [value]="id()" copyLabel="Copy order id" />
    <wr-copy-value [value]="name()" wrap />
    <wr-copy-value [value]="null" emptyLabel="n/a" />
  `,
})
class Host {
  readonly id = signal<string | number | null>('ORD-1042');
  readonly name = signal('Ann Lee');
}

describe('WrCopyValueHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let writeText: Mock<(text: string) => Promise<void>>;

  beforeEach(() => {
    writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });

  it('finds one by its value, and the empty ones by `empty`', async () => {
    const byValue = await loader.getHarness(WrCopyValueHarness.with({ value: /^ORD-/ }));
    expect(await byValue.getValue()).toBe('ORD-1042');

    expect(await loader.getAllHarnesses(WrCopyValueHarness.with({ empty: true }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrCopyValueHarness.with({ empty: false }))).toHaveLength(2);
    // An empty one has no value to match, whatever the pattern.
    expect(await loader.getAllHarnesses(WrCopyValueHarness.with({ value: /.*/ }))).toHaveLength(2);
  });

  it('reads the value, the full text behind a truncated one, and the wrap mode', async () => {
    const [id, name] = await loader.getAllHarnesses(WrCopyValueHarness);

    expect(await id.getValue()).toBe('ORD-1042');
    expect(await id.getTitle()).toBe('ORD-1042');
    expect(await id.isWrapped()).toBe(false);
    expect(await id.getCopyLabel()).toBe('Copy order id');

    expect(await name.getValue()).toBe('Ann Lee');
    expect(await name.getTitle()).toBeNull();
    expect(await name.isWrapped()).toBe(true);
    expect(await name.getCopyLabel()).toBe('Copy');
  });

  it('copies through the button and reports the copied state', async () => {
    const id = await loader.getHarness(WrCopyValueHarness.with({ value: 'ORD-1042' }));
    expect(await id.isCopied()).toBe(false);
    expect(await id.getStatusText()).toBe('');

    await id.copy();

    expect(writeText).toHaveBeenCalledExactlyOnceWith('ORD-1042');
    expect(await id.isCopied()).toBe(true);
    expect(await id.getStatusText()).toBe('Copied');
  });

  it('does not report a refused write as copied', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const id = await loader.getHarness(WrCopyValueHarness.with({ value: 'ORD-1042' }));

    await id.copy();

    expect(await id.isCopied()).toBe(false);
  });

  it('answers for an empty value, and refuses what needs the button', async () => {
    const empty = await loader.getHarness(WrCopyValueHarness.with({ empty: true }));

    expect(await empty.isEmpty()).toBe(true);
    expect(await empty.getValue()).toBeNull();
    expect(await empty.getEmptyText()).toBe('n/a');
    expect(await empty.getTitle()).toBeNull();
    expect(await empty.isFocused()).toBe(false);
    await expect(empty.copy()).rejects.toThrow(/renders no copy button/);
    await expect(empty.getCopyLabel()).rejects.toThrow(/renders no copy button/);
    await expect(empty.focus()).rejects.toThrow(/renders no copy button/);
  });

  it('refuses the placeholder of a filled value', async () => {
    const id = await loader.getHarness(WrCopyValueHarness.with({ value: 'ORD-1042' }));

    expect(await id.isEmpty()).toBe(false);
    await expect(id.getEmptyText()).rejects.toThrow(/renders no placeholder/);
  });

  it('follows a value that becomes empty', async () => {
    const [id] = await loader.getAllHarnesses(WrCopyValueHarness);

    fixture.componentInstance.id.set(null);
    expect(await id.isEmpty()).toBe(true);

    fixture.componentInstance.id.set(0);
    expect(await id.isEmpty()).toBe(false);
    expect(await id.getValue()).toBe('0');
  });

  it('moves focus to the copy button', async () => {
    const id = await loader.getHarness(WrCopyValueHarness.with({ value: 'ORD-1042' }));

    await id.focus();
    expect(await id.isFocused()).toBe(true);
  });
});
