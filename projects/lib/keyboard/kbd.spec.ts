import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrKbdSize } from './interfaces';
import { WrKbd } from './kbd';

@Component({
  imports: [WrKbd],
  template: `<wr-kbd [size]="size()">⌘K</wr-kbd>`,
})
class Host {
  readonly size = signal<WrKbdSize>('md');
}

describe('WrKbd', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-kbd')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the key it was given', () => {
    expect(host().textContent).toBe('⌘K');
  });

  it('always names its size, including the default', () => {
    // Unlike most modifiers in the catalog this one is never omitted — the
    // stylesheet has no unsuffixed size rule to fall back on.
    expect(host().className).toBe('wr-kbd wr-kbd--md');

    for (const size of ['sm', 'lg'] as const) {
      fixture.componentInstance.size.set(size);
      fixture.detectChanges();
      expect(host().className).toBe(`wr-kbd wr-kbd--${size}`);
    }
  });
});
