import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrResultStatus } from './interfaces';
import { WrResult } from './result';

@Component({
  imports: [WrResult],
  template: `
    <wr-result [status]="status()" [title]="title()" [description]="description()">
      <button type="button" wrResultExtra class="cta">Continue</button>
    </wr-result>
  `,
})
class Host {
  readonly status = signal<WrResultStatus>('info');
  readonly title = signal('Submitted!');
  readonly description = signal("We'll be in touch.");
}

/**
 * Five statuses, five illustrations, one of which is the `@default` branch — so the
 * test walks all five rather than trusting the switch. The heading level is part of
 * the contract too: an `<h2>` is what the page outline gets.
 */
describe('WrResult', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-result')!;
  const icon = (): HTMLElement => root().querySelector<HTMLElement>('.wr-result__icon')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the title as a heading and the description as a paragraph', () => {
    const title = root().querySelector('.wr-result__title')!;
    expect(title.tagName).toBe('H2');
    expect(title.textContent.trim()).toBe('Submitted!');
    expect(root().querySelector('.wr-result__description')!.tagName).toBe('P');
  });

  it('drops the title and the description when they are empty', () => {
    fixture.componentInstance.title.set('');
    fixture.componentInstance.description.set('');
    fixture.detectChanges();

    expect(root().querySelector('.wr-result__title')).toBeNull();
    expect(root().querySelector('.wr-result__description')).toBeNull();
  });

  it('carries the status as a modifier and draws an illustration for each', () => {
    for (const status of ['success', 'warning', 'error', 'info', 'empty'] as const) {
      fixture.componentInstance.status.set(status);
      fixture.detectChanges();

      expect(host().className, status).toBe(`wr-result wr-result--${status}`);
      expect(icon().querySelector('svg'), status).not.toBeNull();
    }
  });

  it('keeps the illustration out of the accessible tree', () => {
    // It is decoration for the title, which carries the meaning.
    expect(icon().getAttribute('aria-hidden')).toBe('true');
  });

  it('projects the action row into its own slot', () => {
    expect(root().querySelector('.wr-result__extra')!.querySelector('.cta')).not.toBeNull();
  });
});
