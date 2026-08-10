import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCard, WrCardFooter, WrCardHeader } from './card';

@Component({
  imports: [WrCard, WrCardHeader, WrCardFooter],
  template: `
    <wr-card [bordered]="bordered()" [hoverable]="hoverable()" [loading]="loading()" [compact]="compact()">
      <wr-card-header>Title</wr-card-header>
      Body copy
      <wr-card-footer>Footer</wr-card-footer>
    </wr-card>
  `,
})
class Host {
  readonly bordered = signal(true);
  readonly hoverable = signal(false);
  readonly loading = signal(false);
  readonly compact = signal(false);
}

/**
 * Three projection slots in a fixed order — header, body, footer — which is the
 * part a template change can silently break: the header and footer are matched by
 * SELECTOR, so renaming either component would drop it into the body instead.
 */
describe('WrCard', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-card')!;
  const body = (): HTMLElement => root().querySelector<HTMLElement>('.wr-card__body')!;
  /**
   * The class SET, sorted. A `[class]` string binding is applied class by class,
   * so the DOM order is the diff order rather than the order the component wrote
   * them in — comparing the raw `className` fails on a reordering that changes
   * nothing about what a stylesheet sees.
   */
  const classes = (el: HTMLElement): string[] => [...el.classList].sort();

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is bordered by default, with nothing else on it', () => {
    expect(host().className).toBe('wr-card wr-card--bordered');
    expect(host().getAttribute('aria-busy')).toBeNull();
  });

  it('names each option it was given', () => {
    fixture.componentInstance.hoverable.set(true);
    fixture.componentInstance.compact.set(true);
    fixture.componentInstance.bordered.set(false);
    fixture.detectChanges();

    expect(classes(host())).toEqual(['wr-card', 'wr-card--compact', 'wr-card--hoverable']);
  });

  it('keeps the header and footer out of the body', () => {
    expect(body().textContent.trim()).toBe('Body copy');
    expect(root().querySelector('wr-card-header')!.className).toBe('wr-card__header');
    expect(root().querySelector('wr-card-footer')!.className).toBe('wr-card__footer');
    expect(body().querySelector('wr-card-header')).toBeNull();
  });

  it('announces the card as busy while it loads, and covers it', () => {
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    expect(host().getAttribute('aria-busy')).toBe('true');
    expect(host().className).toContain('wr-card--loading');
    const overlay = root().querySelector('.wr-card__loading')!;
    // `aria-busy` on the card is what a reader acts on; the spinner is decoration.
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  it('drops the overlay again when the load finishes', () => {
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();

    expect(root().querySelector('.wr-card__loading')).toBeNull();
  });
});
