import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('marks the host busy, blocks its content and renders a spinner on a veil', async () => {
    fixture.componentInstance.busy.set(true);
    await render();

    expect(form().getAttribute('aria-busy')).toBe('true');
    expect(query('.field')!.hasAttribute('inert')).toBe(true);

    const veil = query('.wr-busy__veil')!;
    expect(veil.parentElement).toBe(form());
    const spinner = veil.querySelector('wr-spinner')!;
    expect(spinner.className).toBe('wr-spinner wr-spinner--lg');
    expect(spinner.querySelector('svg')).not.toBeNull();
  });

  it('keeps the host out of inert', async () => {
    fixture.componentInstance.busy.set(true);
    await render();

    expect(form().hasAttribute('inert')).toBe(false);
  });

  it('announces the label outside the busy host, and hides the veil from assistive technology', async () => {
    const announce = vi.spyOn(TestBed.inject(LiveAnnouncer), 'announce');
    fixture.componentInstance.busy.set(true);
    await render();

    expect(announce).toHaveBeenLastCalledWith('Loading', 'polite');
    expect(query('.wr-busy__veil')!.getAttribute('aria-hidden')).toBe('true');
    expect(form().querySelector('[role="status"]:not([aria-hidden="true"] *), [aria-live]')).toBeNull();
    const region = document.querySelector('.cdk-live-announcer-element')!;
    expect(form().contains(region)).toBe(false);

    fixture.componentInstance.label.set('Saving');
    await render();
    expect(announce).toHaveBeenLastCalledWith('Saving', 'polite');
    expect(announce).toHaveBeenCalledTimes(2);
    expect(form().querySelectorAll('.wr-busy__veil').length).toBe(1);
  });

  it('announces nothing while off', async () => {
    const announce = vi.spyOn(TestBed.inject(LiveAnnouncer), 'announce');
    fixture.componentInstance.label.set('Saving');
    await render();

    expect(announce).not.toHaveBeenCalled();
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
    fixture.componentInstance.busy.set(true);
    await render();
    expect(form().classList.contains('wr-busy--relative')).toBe(true);
    expect(form().getAttribute('style')).toBeNull();

    fixture.componentInstance.busy.set(false);
    await render();
    expect(form().classList.contains('wr-busy--relative')).toBe(false);
    fixture.componentInstance.position.set('absolute');
    fixture.componentInstance.busy.set(true);
    await render();
    expect(form().classList.contains('wr-busy--relative')).toBe(false);
    expect(form().style.position).toBe('absolute');
  });

  it('overrides an inline static position while busy, and puts it back', async () => {
    form().style.setProperty('position', 'static', 'important');
    form().style.setProperty('color', 'red');
    const before = form().getAttribute('style');

    fixture.componentInstance.busy.set(true);
    await render();
    expect(getComputedStyle(form()).position).toBe('relative');

    fixture.componentInstance.busy.set(false);
    await render();
    expect(form().getAttribute('style')).toBe(before);
  });

  it('keeps an inline position the consumer wrote while busy', async () => {
    fixture.componentInstance.position.set('static');
    fixture.componentInstance.busy.set(true);
    await render();
    expect(form().style.position).toBe('relative');

    fixture.componentInstance.position.set('sticky');
    await render();
    fixture.componentInstance.busy.set(false);
    await render();
    expect(form().style.position).toBe('sticky');
  });

  it('keeps a priority the consumer changed while busy', async () => {
    form().style.setProperty('position', 'static');

    fixture.componentInstance.busy.set(true);
    await render();
    form().style.setProperty('position', 'relative', 'important');
    fixture.componentInstance.busy.set(false);
    await render();
    expect(form().style.getPropertyValue('position')).toBe('relative');
    expect(form().style.getPropertyPriority('position')).toBe('important');
  });

  it('cleans up when the host is destroyed while busy', async () => {
    fixture.componentInstance.busy.set(true);
    await render();
    const field = query('.field')!;

    fixture.destroy();

    expect(field.hasAttribute('inert')).toBe(false);
  });
});
