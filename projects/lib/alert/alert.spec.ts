import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrAlert } from './alert';
import type { WrAlertType } from './interfaces';

@Component({
  imports: [WrAlert],
  template: `
    <wr-alert
      [type]="type()"
      [title]="title()"
      [message]="message()"
      [closeable]="closeable()"
      [closeLabel]="closeLabel()"
      (closed)="closes.set(closes() + 1)"
    />
  `,
})
class Host {
  readonly type = signal<WrAlertType>('info');
  readonly title = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly closeable = signal(false);
  readonly closeLabel = signal<string | null>(null);
  readonly closes = signal(0);
}

/**
 * An alert is a live region, and the interesting part is that it does not use
 * ONE: a danger alert interrupts (`role="alert"` / `assertive`), everything
 * else waits its turn (`role="status"` / `polite`). Getting that backwards
 * either buries an error or makes a hint shout over whatever the user was
 * reading.
 */
describe('WrAlert', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-alert')!;
  const closeButton = (): HTMLButtonElement | null => root().querySelector<HTMLButtonElement>('.wr-alert__close');

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('waits its turn for an ordinary alert', () => {
    expect([host().getAttribute('role'), host().getAttribute('aria-live')]).toEqual(['status', 'polite']);
  });

  it('interrupts for a danger alert', () => {
    fixture.componentInstance.type.set('danger');
    fixture.detectChanges();

    // An error that politely queues behind the rest of the page is an error
    // the user acts too late on.
    expect([host().getAttribute('role'), host().getAttribute('aria-live')]).toEqual(['alert', 'assertive']);
  });

  it('is assertive but not interrupting for a warning', () => {
    fixture.componentInstance.type.set('warning');
    fixture.detectChanges();

    expect([host().getAttribute('role'), host().getAttribute('aria-live')]).toEqual(['status', 'assertive']);
  });

  it('renders the title above the message', () => {
    fixture.componentInstance.title.set('Heads up');
    fixture.componentInstance.message.set('Something happened');
    fixture.detectChanges();

    expect(root().querySelector('.wr-alert__title')!.textContent.trim()).toBe('Heads up');
    expect(root().querySelector('.wr-alert__message')!.textContent.trim()).toBe('Something happened');
  });

  it('promotes a lone message into the title slot', () => {
    fixture.componentInstance.message.set('Your changes are live.');
    fixture.detectChanges();

    // One line of text should read as the alert's headline, not as a subtitle
    // under an empty heading.
    expect(root().querySelector('.wr-alert__title')!.textContent.trim()).toBe('Your changes are live.');
    expect(root().querySelector('.wr-alert__message')).toBeNull();
  });

  it('is driven by inputs — it projects no content', () => {
    // Worth stating: `<wr-alert>text</wr-alert>` renders an EMPTY alert, with
    // no template error and nothing in the console. Every documented example
    // is self-closing with `title` / `message`.
    expect(host().querySelector('ng-content')).toBeNull();
    expect(host().textContent.trim()).toBe('');
  });

  it('offers no dismiss button unless asked', () => {
    expect(closeButton()).toBeNull();

    fixture.componentInstance.closeable.set(true);
    fixture.detectChanges();
    expect(closeButton()).not.toBeNull();
  });

  it('names the dismiss button in plain English with no i18n configured', () => {
    fixture.componentInstance.closeable.set(true);
    fixture.detectChanges();

    // `t()` returns the KEY on a miss and `WrI18n` ships an empty catalog by
    // default, so a bare call would name this button "alert.close" — a name
    // axe cannot fault, because a name is present.
    expect(closeButton()!.getAttribute('aria-label')).toBe('Close alert');
  });

  it('lets the host override the dismiss label', () => {
    fixture.componentInstance.closeable.set(true);
    fixture.componentInstance.closeLabel.set('Dismiss this warning');
    fixture.detectChanges();

    expect(closeButton()!.getAttribute('aria-label')).toBe('Dismiss this warning');
  });

  it('removes itself on dismiss, and says so once', () => {
    fixture.componentInstance.closeable.set(true);
    fixture.detectChanges();

    closeButton()!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closes()).toBe(1);
    expect(root().querySelector('.wr-alert__close')).toBeNull();
    // The live region has to go with it — a dismissed alert still advertising
    // `role="status"` leaves an empty announcer on the page.
    expect(host().getAttribute('role')).toBeNull();
  });

  it('carries the public BEM classes, including the type modifier', () => {
    fixture.componentInstance.type.set('success');
    fixture.detectChanges();

    expect(host().className).toContain('wr-alert');
    expect(host().className).toContain('wr-alert--success');
  });
});

describe('WrAlert with a catalog', () => {
  @Component({
    imports: [WrAlert],
    template: `<wr-alert closeable>Body</wr-alert>`,
  })
  class CatalogHost {}

  it('prefers a registered catalog string over the fallback', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }),
        provideWrI18nStaticLoader({ en: { alert: { close: 'Zakryt' } } }),
      ],
    });
    const fixture = TestBed.createComponent(CatalogHost);
    fixture.detectChanges();
    // The static loader resolves asynchronously even for an object literal.
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    const label = (fixture.nativeElement as HTMLElement).querySelector('.wr-alert__close')!.getAttribute('aria-label');
    expect(label).toBe('Zakryt');
    fixture.destroy();
  });
});
