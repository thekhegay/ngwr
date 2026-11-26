import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBusy } from './busy';

@Component({
  imports: [WrBusy],
  template: `
    <form [wrBusy]="busy()" [wrBusyLabel]="label()" [style.position]="position()">
      <input class="field" />
      <fieldset class="locked" inert><input /></fieldset>
      @if (extra()) {
        <button class="late" type="button">Late</button>
      }
    </form>
  `,
})
class Host {
  readonly busy = signal(false);
  readonly label = signal<string | null>(null);
  readonly position = signal<string | null>(null);
  readonly extra = signal(false);
}

/**
 * jsdom implements no `inert` behaviour, so these prove the attributes and the
 * rendered veil, not that focus and clicks are refused.
 */
describe('WrBusy', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const form = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('form')!;
  const query = (selector: string): HTMLElement | null => form().querySelector<HTMLElement>(selector);
  const render = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    await render();
  });

  afterEach(() => {
    fixture.destroy();
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('renders nothing and sets nothing while off', () => {
    expect(form().className).toBe('wr-busy');
    expect(form().hasAttribute('aria-busy')).toBe(false);
    expect(form().hasAttribute('inert')).toBe(false);
    expect(query('.field')!.hasAttribute('inert')).toBe(false);
    expect(query('.wr-busy__veil')).toBeNull();
    expect(query('wr-spinner')).toBeNull();
  });

  it('marks the host busy, blocks its content and renders a named spinner on a veil', async () => {
    fixture.componentInstance.busy.set(true);
    await render();

    expect(form().getAttribute('aria-busy')).toBe('true');
    expect(query('.field')!.hasAttribute('inert')).toBe(true);

    const veil = query('.wr-busy__veil')!;
    expect(veil.parentElement).toBe(form());
    const spinner = veil.querySelector('wr-spinner')!;
    expect(spinner.getAttribute('role')).toBe('status');
    expect(spinner.getAttribute('aria-label')).toBe('Loading');
    expect(spinner.className).toBe('wr-spinner wr-spinner--lg');
    expect(spinner.querySelector('svg')).not.toBeNull();
  });

  it('keeps the host and the veil out of inert, so the spinner stays announced', async () => {
    fixture.componentInstance.busy.set(true);
    await render();

    expect(form().hasAttribute('inert')).toBe(false);
    expect(query('.wr-busy__veil')!.hasAttribute('inert')).toBe(false);
  });

  it('passes the label through to the spinner', async () => {
    fixture.componentInstance.busy.set(true);
    fixture.componentInstance.label.set('Saving');
    await render();
    expect(query('wr-spinner')!.getAttribute('aria-label')).toBe('Saving');

    fixture.componentInstance.label.set('Almost there');
    await render();
    expect(query('wr-spinner')!.getAttribute('aria-label')).toBe('Almost there');
    expect(form().querySelectorAll('.wr-busy__veil').length).toBe(1);
  });

  it('removes all of it when turned off, and leaves an inert the consumer set', async () => {
    fixture.componentInstance.busy.set(true);
    await render();
    expect(query('.locked')!.hasAttribute('inert')).toBe(true);

    fixture.componentInstance.busy.set(false);
    await render();

    expect(form().className).toBe('wr-busy');
    expect(form().hasAttribute('aria-busy')).toBe(false);
    expect(query('.field')!.hasAttribute('inert')).toBe(false);
    expect(query('.locked')!.hasAttribute('inert')).toBe(true);
    expect(query('.wr-busy__veil')).toBeNull();
    expect(query('wr-spinner')).toBeNull();
  });

  it('blocks content rendered while busy, and frees it afterwards', async () => {
    fixture.componentInstance.busy.set(true);
    await render();
    fixture.componentInstance.extra.set(true);
    await render();
    await Promise.resolve();
    expect(query('.late')!.hasAttribute('inert')).toBe(true);

    fixture.componentInstance.busy.set(false);
    await render();
    expect(query('.late')!.hasAttribute('inert')).toBe(false);
  });

  it('positions a static host through a class, and only a static one', async () => {
    fixture.componentInstance.position.set('static');
    fixture.componentInstance.busy.set(true);
    await render();
    expect(form().classList.contains('wr-busy--relative')).toBe(true);
    expect(form().style.position).toBe('static');

    fixture.componentInstance.busy.set(false);
    await render();
    fixture.componentInstance.position.set('absolute');
    fixture.componentInstance.busy.set(true);
    await render();
    expect(form().classList.contains('wr-busy--relative')).toBe(false);
  });

  it('cleans up when the host is destroyed while busy', async () => {
    fixture.componentInstance.busy.set(true);
    await render();
    const field = query('.field')!;

    fixture.destroy();

    expect(field.hasAttribute('inert')).toBe(false);
  });
});
