import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrAlert } from './alert';
import type { WrAlertType } from './types';

@Component({
  imports: [WrAlert],
  template: `
    <wr-alert
      [type]="type()"
      [title]="title()"
      [message]="message()"
      [closable]="closable()"
      [closeLabel]="closeLabel()"
      (closed)="closes.set(closes() + 1)"
    />
  `,
})
class Host {
  readonly type = signal<WrAlertType>('info');
  readonly title = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly closable = signal(false);
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

  it('leaves the content box empty when nothing is projected', () => {
    // The stylesheet hides `.wr-alert__content:empty`, so this is what keeps a
    // self-closing alert from gaining a gap under its message. A whitespace-only
    // text node, such as an empty `{{ detail }}` on its own line, is not
    // `:empty` and still adds that gap.
    expect(root().querySelector('.wr-alert__content')!.childNodes).toHaveLength(0);
  });

  it('offers no dismiss button unless asked', () => {
    expect(closeButton()).toBeNull();

    fixture.componentInstance.closable.set(true);
    fixture.detectChanges();
    expect(closeButton()).not.toBeNull();
  });

  it('names the dismiss button in plain English with no i18n configured', () => {
    fixture.componentInstance.closable.set(true);
    fixture.detectChanges();

    // `t()` returns the KEY on a miss and `WrI18n` ships an empty catalog by
    // default, so a bare call would name this button "alert.close" — a name
    // axe cannot fault, because a name is present.
    expect(closeButton()!.getAttribute('aria-label')).toBe('Close alert');
  });

  it('lets the host override the dismiss label', () => {
    fixture.componentInstance.closable.set(true);
    fixture.componentInstance.closeLabel.set('Dismiss this warning');
    fixture.detectChanges();

    expect(closeButton()!.getAttribute('aria-label')).toBe('Dismiss this warning');
  });

  it('removes itself on dismiss, and says so once', () => {
    fixture.componentInstance.closable.set(true);
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

// `<wr-alert>text</wr-alert>` used to render an EMPTY alert: the template had
// no `<ng-content>`, and nothing in the console said the text was dropped.
describe('WrAlert with projected content', () => {
  @Component({
    imports: [WrAlert],
    template: `<wr-alert title="Sync failed" message="Nothing was saved."
      >Request <code>8f2c41</code> timed out.</wr-alert
    >`,
  })
  class ContentHost {}

  it('renders it below the message', () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(ContentHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const content = root.querySelector('.wr-alert__content')!;
    const message = root.querySelector('.wr-alert__message')!;

    expect(content.textContent.trim()).toBe('Request 8f2c41 timed out.');
    expect(content.querySelector('code')).not.toBeNull();
    // eslint-disable-next-line no-bitwise -- compareDocumentPosition answers with a bitmask
    expect(message.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fixture.destroy();
  });
});

describe('WrAlert with actions', () => {
  @Component({
    imports: [WrAlert],
    template: `<wr-alert title="Update available" message="Version 2.0 is ready." closable>
      <button type="button" wrAlertActions (click)="installs.set(installs() + 1)">Install</button>
      <button type="button" wrAlertActions>Later</button>
    </wr-alert>`,
  })
  class ActionsHost {
    readonly installs = signal(0);
  }

  /**
   * The slot lives inside the body column, under the message, so the close button
   * that sits BESIDE the body can never overlap a projected button; an alert with
   * no actions keeps the slot empty, which the stylesheet hides.
   */
  it('projects [wrAlertActions] into the body, under the message', () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(ActionsHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const actions = root.querySelector<HTMLElement>('.wr-alert__actions')!;
    const message = root.querySelector('.wr-alert__message')!;

    expect(actions.closest('.wr-alert__body')).not.toBeNull();
    expect([...actions.querySelectorAll('button')].map(b => b.textContent.trim())).toEqual(['Install', 'Later']);
    // eslint-disable-next-line no-bitwise -- compareDocumentPosition answers with a bitmask
    expect(message.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(actions.querySelector('.wr-alert__close')).toBeNull();
    expect(root.querySelector('.wr-alert__close')).not.toBeNull();

    actions.querySelector('button')!.click();
    expect(fixture.componentInstance.installs()).toBe(1);
    fixture.destroy();
  });

  it('leaves the slot empty when nothing is projected', () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const actions = (fixture.nativeElement as HTMLElement).querySelector('.wr-alert__actions')!;

    expect(actions.childNodes.length).toBe(0);
    fixture.destroy();
  });
});

describe('WrAlert with a catalog', () => {
  @Component({
    imports: [WrAlert],
    template: `<wr-alert closable>Body</wr-alert>`,
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

/**
 * Every documented `[type]`, driven once each. The modifier is public API and
 * the type also decides the live-region behaviour, so a value that stops
 * emitting its class is a styling break AND an announcement break.
 */
describe('WrAlert emits a modifier for every documented type', () => {
  @Component({
    imports: [WrAlert],
    template: `<wr-alert [type]="type()">Message</wr-alert>`,
  })
  class TypeHost {
    readonly type = signal<WrAlertType>('info');
  }

  const TYPES: readonly WrAlertType[] = ['info', 'success', 'warning', 'danger', 'neutral', 'offline'];
  let fixture: ReturnType<typeof TestBed.createComponent<TypeHost>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(TypeHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it.each(TYPES)('type %s', type => {
    fixture.componentInstance.type.set(type);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('wr-alert')!.classList).toContain(`wr-alert--${type}`);
  });
});

/**
 * The close button leaves the DOM with the rest of the alert, and a focused element
 * that leaves drops the caret on `<body>`: the next Tab, and a screen reader's place,
 * started over from the top of the page. jsdom lays nothing out, so every candidate
 * is given a box; `getFocusableElements` drops what has none.
 */
describe('WrAlert dismissed from the keyboard', () => {
  @Component({
    imports: [WrAlert],
    template: `
      <button id="before" type="button">Before</button>
      <wr-alert title="Saved" closable (closed)="onClosed()" />
      @if (showAfter()) {
        <button id="after" type="button">After</button>
      }
      <button id="elsewhere" type="button">Elsewhere</button>
    `,
  })
  class FocusHost {
    readonly showAfter = signal(true);
    moveTo: string | null = null;
    onClosed(): void {
      if (this.moveTo) document.getElementById(this.moveTo)!.focus();
    }
  }

  let fixture: ReturnType<typeof TestBed.createComponent<FocusHost>>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const dismiss = async (): Promise<void> => {
    const close = root().querySelector<HTMLButtonElement>('.wr-alert__close')!;
    close.focus();
    close.click();
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      { width: 1, height: 1 },
    ] as unknown as DOMRectList);
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(FocusHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('moves focus on to whatever follows the alert', async () => {
    await dismiss();
    expect(document.activeElement?.id).toBe('after');
  });

  it('moves it back to whatever precedes it when nothing follows', async () => {
    fixture.componentInstance.showAfter.set(false);
    fixture.detectChanges();
    root().querySelector('#elsewhere')!.remove();

    await dismiss();
    expect(document.activeElement?.id).toBe('before');
  });

  it('leaves focus where a (closed) handler put it', async () => {
    fixture.componentInstance.moveTo = 'elsewhere';
    await dismiss();
    expect(document.activeElement?.id).toBe('elsewhere');
  });

  it('takes no focus it did not have', async () => {
    const before = root().querySelector<HTMLButtonElement>('#before')!;
    before.focus();
    root().querySelector<HTMLButtonElement>('.wr-alert__close')!.click();
    await fixture.whenStable();

    expect(document.activeElement).toBe(before);
  });
});
