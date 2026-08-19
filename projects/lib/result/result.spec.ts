import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrResultStatus } from './interfaces';
import { WrResult403, WrResult404, WrResult500 } from './presets';
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

describe('the status presets', () => {
  /**
   * The `@example` on each preset shows a `[wrResultExtra]` button inside it,
   * and until this spec existed that example did not work.
   *
   * `<wr-result>` projects only `select="[wrResultExtra]"`, and the presets
   * wrapped a BARE `<ng-content />`. The outer component matches its selector
   * against the nodes in the intermediate TEMPLATE, and an `<ng-content>`
   * element does not carry the attribute — so the button was dropped silently,
   * with no error anywhere. `ngProjectAs` is what tells the outer slot what the
   * pass-through stands for.
   *
   * Three separate hosts rather than one parameterised template, because a
   * component's `template` has to be a literal.
   */
  it('passes [wrResultExtra] through wr-result-404', () => {
    expectProjected(Host404);
  });

  it('passes [wrResultExtra] through wr-result-403', () => {
    expectProjected(Host403);
  });

  it('passes [wrResultExtra] through wr-result-500', () => {
    expectProjected(Host500);
  });
});

function expectProjected(host: new (...args: never[]) => unknown): void {
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();

  expect((fixture.nativeElement as HTMLElement).querySelector('#extra')).not.toBeNull();
}

@Component({
  imports: [WrResult404],
  template: `<wr-result-404><button type="button" wrResultExtra id="extra">Back home</button></wr-result-404>`,
})
class Host404 {}

@Component({
  imports: [WrResult403],
  template: `<wr-result-403><button type="button" wrResultExtra id="extra">Back home</button></wr-result-403>`,
})
class Host403 {}

@Component({
  imports: [WrResult500],
  template: `<wr-result-500><button type="button" wrResultExtra id="extra">Back home</button></wr-result-500>`,
})
class Host500 {}
