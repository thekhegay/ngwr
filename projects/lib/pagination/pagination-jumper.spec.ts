import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, expect, it } from 'vitest';

import { WrPagination } from './pagination';

@Component({
  imports: [WrPagination],
  template: `<wr-pagination [(page)]="page" [total]="95" [disabled]="disabled()" [showJumper]="jumper()" />`,
})
class Host {
  readonly page = signal(1);
  readonly disabled = signal(false);
  readonly jumper = signal(true);
}

function setup(): {
  fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  field: () => HTMLInputElement | null;
  enter: (text: string) => void;
  host: Host;
} {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement | null => root.querySelector('.wr-pagination__jump');
  const enter = (text: string): void => {
    const input = field()!;
    input.value = text;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
  };
  return { fixture, field, enter, host: fixture.componentInstance };
}

describe('WrPagination jumper', () => {
  it('is hidden by default', () => {
    const { fixture, field, host } = setup();
    host.jumper.set(false);
    fixture.detectChanges();
    expect(field()).toBeNull();
  });

  it('names the field and commits on Enter, then clears', () => {
    const { field, enter, host } = setup();
    expect(field()!.getAttribute('aria-label')).toBe('Go to page');
    enter('4');
    expect(host.page()).toBe(4);
    expect(field()!.value).toBe('');
  });

  it('cancels the Enter keydown so an enclosing form is not submitted', () => {
    const { fixture, field } = setup();
    field()!.value = '4';
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    field()!.dispatchEvent(event);
    fixture.detectChanges();
    expect(event.defaultPrevented).toBe(true);
  });

  it('commits on blur', () => {
    const { fixture, field, host } = setup();
    field()!.value = '3';
    field()!.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(host.page()).toBe(3);
  });

  it('clamps to the first and last page', () => {
    const { enter, host } = setup();
    enter('999');
    expect(host.page()).toBe(10);
    enter('0');
    expect(host.page()).toBe(1);
  });

  it('ignores empty and invalid input', () => {
    const { enter, host } = setup();
    host.page.set(5);
    for (const text of ['', 'abc', '2.5', '-3']) enter(text);
    expect(host.page()).toBe(5);
  });

  it('disables the field with the pager', () => {
    const { fixture, field, host } = setup();
    host.disabled.set(true);
    fixture.detectChanges();
    expect(field()!.disabled).toBe(true);
  });
});
