import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrIcons, wrSvgIcon } from 'ngwr/icon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTag } from './tag';

@Component({
  imports: [WrTag],
  template: `
    @for (topic of topics(); track topic) {
      <wr-tag
        [closable]="closable()"
        [removeLabel]="removeLabel()"
        [loading]="loading()"
        (click)="log.push('click ' + topic)"
        (removed)="remove(topic)"
      >
        {{ topic }}
      </wr-tag>
    }
    <button type="button" id="after">After</button>
  `,
})
class Host {
  readonly topics = signal(['Angular', 'Signals', 'Forms']);
  readonly closable = signal(true);
  readonly removeLabel = signal<string | null>(null);
  readonly loading = signal(false);
  /** Whether `(removed)` drops the tag from the list, as an app would. */
  drops = false;
  readonly log: string[] = [];

  remove(topic: string): void {
    this.log.push(`removed ${topic}`);
    if (this.drops) this.topics.update(all => all.filter(t => t !== topic));
  }
}

/**
 * The remove button is the tag's one interactive part, so this file reads what
 * a user and a screen reader get from it: a real button, its name, and one
 * `removed` per gesture. The name follows the PROJECTED text, which only the
 * DOM knows, so every read waits for `whenStable()` rather than one pass.
 */
describe('WrTag closable', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const tags = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('wr-tag')];
  const buttons = (): HTMLButtonElement[] => [...root().querySelectorAll<HTMLButtonElement>('.wr-tag__remove')];
  const names = (): (string | null)[] => buttons().map(button => button.getAttribute('aria-label'));
  const log = (): string[] => fixture.componentInstance.log;

  const key = (target: EventTarget, name: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
  };

  beforeEach(() => {
    // jsdom lays nothing out, and `wrGetFocusableElements` drops what has no box.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      { width: 1, height: 1 },
    ] as unknown as DOMRectList);
    return mount();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('renders no button, and no modifier, unless asked', async () => {
    fixture.componentInstance.closable.set(false);
    await fixture.whenStable();

    expect(buttons()).toEqual([]);
    expect(tags()[0].className).toBe('wr-tag wr-tag--primary');
  });

  it('renders a real button at the end of the tag, reachable by Tab', () => {
    const [button] = buttons();

    expect(buttons()).toHaveLength(3);
    expect([button.tagName, button.type, button.tabIndex]).toEqual(['BUTTON', 'button', 0]);
    expect(tags()[0].lastElementChild).toBe(button);
    expect(tags()[0].classList.contains('wr-tag--closable')).toBe(true);
    // The glyph says nothing: the name is the button's own.
    expect(button.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(button.textContent.trim()).toBe('');
  });

  it('names the button after the tag it removes', () => {
    expect(names()).toEqual(['Remove Angular', 'Remove Signals', 'Remove Forms']);
  });

  it('follows the text when the parent rewrites it', async () => {
    fixture.componentInstance.topics.set(['Router']);
    await fixture.whenStable();

    expect(names()).toEqual(['Remove Router']);
  });

  it('takes the name it is given', async () => {
    fixture.componentInstance.removeLabel.set('Drop this topic');
    await fixture.whenStable();

    expect(names()[0]).toBe('Drop this topic');
  });

  it('takes its name from the catalog', async () => {
    await mount([
      provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
      provideWrI18nStaticLoader({ ru: wrRu }),
    ]);
    await fixture.whenStable();

    expect(names()[0]).toBe('Удалить Angular');
  });

  it('emits removed once per click, and keeps the click from the tag', () => {
    buttons()[1].click();

    expect(log()).toEqual(['removed Signals']);

    buttons()[1].click();

    expect(log()).toEqual(['removed Signals', 'removed Signals']);
    // The tag did not remove itself: the list is the consumer's.
    expect(tags()).toHaveLength(3);
  });

  it('still takes a click on the tag itself', () => {
    tags()[0].click();

    expect(log()).toEqual(['click Angular']);
  });

  it.each(['Delete', 'Backspace'])('removes on %s typed on the button', name => {
    const event = key(buttons()[0], name);

    expect(log()).toEqual(['removed Angular']);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves every other key alone', () => {
    const events = ['a', 'Escape', 'ArrowLeft'].map(name => key(buttons()[0], name));

    expect(log()).toEqual([]);
    expect(events.map(event => event.defaultPrevented)).toEqual([false, false, false]);
  });

  it('removes on Delete typed on a tag the consumer made focusable, and only while closable', async () => {
    tags()[0].tabIndex = 0;
    key(tags()[0], 'Delete');
    expect(log()).toEqual(['removed Angular']);

    fixture.componentInstance.closable.set(false);
    await fixture.whenStable();
    key(tags()[0], 'Delete');

    expect(log()).toEqual(['removed Angular']);
  });

  it('keeps the button on a loading tag', async () => {
    fixture.componentInstance.loading.set(true);
    await fixture.whenStable();

    expect(buttons()).toHaveLength(3);
    expect(names()[0]).toBe('Remove Angular');
  });

  it('moves focus to the next stop when the removed tag leaves the page', async () => {
    fixture.componentInstance.drops = true;
    buttons()[0].focus();
    buttons()[0].click();
    await fixture.whenStable();

    expect(names()).toEqual(['Remove Signals', 'Remove Forms']);
    expect(document.activeElement).toBe(buttons()[0]);
  });

  it('moves focus back a stop when nothing follows the removed tag', async () => {
    fixture.componentInstance.drops = true;
    root().querySelector('#after')!.remove();
    buttons()[2].focus();
    buttons()[2].click();
    await fixture.whenStable();

    expect(document.activeElement).toBe(buttons()[1]);
  });

  it('leaves focus on the button of a tag that stayed', async () => {
    buttons()[0].focus();
    buttons()[0].click();
    await fixture.whenStable();

    expect(document.activeElement).toBe(buttons()[0]);
  });
});

describe('WrTag closable, around what else the tag holds', () => {
  @Component({
    imports: [WrTag],
    template: `
      <wr-tag closable icon="copy" (removed)="log.push('removed')">Copy <input aria-label="Count" /></wr-tag>
      <wr-tag closable icon="copy" (removed)="log.push('removed')" />
    `,
  })
  class RichHost {
    readonly log: string[] = [];
  }

  let fixture: ReturnType<typeof TestBed.createComponent<RichHost>>;

  const buttons = (): HTMLButtonElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.wr-tag__remove'),
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      // The `<title>` lands in the icon host's text, which the name must skip.
      providers: [provideWrIcons([wrSvgIcon('copy', '<svg viewBox="0 0 24 24"><title>Copy icon</title></svg>')])],
    });
    fixture = TestBed.createComponent(RichHost);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('reads the label only, not the icon beside it', () => {
    expect(buttons()[0].getAttribute('aria-label')).toBe('Remove Copy');
  });

  it('falls back to the bare verb on a tag with no text', () => {
    expect(buttons()[1].getAttribute('aria-label')).toBe('Remove');
  });

  it('leaves Backspace typed in a field inside the tag to the field', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
    input.dispatchEvent(event);

    expect(fixture.componentInstance.log).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });
});

@Component({
  imports: [WrTag],
  template: `
    <wr-tag id="plain" role="status" [attr.tabindex]="-1">Plain</wr-tag>
    <wr-tag id="toggle" [(selected)]="on" [loading]="loading()" (click)="clicks.push('toggle')">Open</wr-tag>
    <wr-tag id="closable" closable [(selected)]="closableOn" (removed)="removed.push('closable')">Mine</wr-tag>
    <wr-tag id="late" role="status" [selected]="late()">Late</wr-tag>
  `,
})
class ToggleHost {
  readonly on = signal(false);
  readonly closableOn = signal(false);
  readonly loading = signal(false);
  readonly late = signal<boolean | undefined>(undefined);
  readonly clicks: string[] = [];
  readonly removed: string[] = [];
}

describe('WrTag selected', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ToggleHost>>;

  const get = (id: string): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`#${id}`)!;
  const key = (target: EventTarget, name: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(ToggleHost);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('adds nothing while selected is undefined', async () => {
    const plain = get('plain');
    expect(plain.getAttribute('role')).toBe('status');
    expect(plain.getAttribute('tabindex')).toBe('-1');
    expect(plain.hasAttribute('aria-pressed')).toBe(false);
    expect(plain.classList.contains('wr-tag--selected')).toBe(false);

    plain.click();
    expect(key(plain, ' ').defaultPrevented).toBe(false);
    await fixture.whenStable();
    expect(plain.hasAttribute('aria-pressed')).toBe(false);
  });

  it('reflects a boolean as a toggle button', async () => {
    const toggle = get('toggle');
    expect(toggle.getAttribute('role')).toBe('button');
    expect(toggle.getAttribute('tabindex')).toBe('0');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.classList.contains('wr-tag--selected')).toBe(false);

    fixture.componentInstance.on.set(true);
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.classList.contains('wr-tag--selected')).toBe(true);
  });

  it('flips on click and emits selectedChange', async () => {
    get('toggle').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.on()).toBe(true);
    expect(get('toggle').getAttribute('aria-pressed')).toBe('true');

    get('toggle').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.on()).toBe(false);
  });

  it('flips on Enter and on Space, as a click', async () => {
    const toggle = get('toggle');
    expect(key(toggle, 'Enter').defaultPrevented).toBe(true);
    await fixture.whenStable();
    expect(fixture.componentInstance.on()).toBe(true);

    expect(key(toggle, ' ').defaultPrevented).toBe(true);
    await fixture.whenStable();
    expect(fixture.componentInstance.on()).toBe(false);
    expect(fixture.componentInstance.clicks).toEqual(['toggle', 'toggle']);
  });

  it('does not flip while loading, and says so', async () => {
    fixture.componentInstance.loading.set(true);
    await fixture.whenStable();
    const toggle = get('toggle');
    expect(toggle.getAttribute('aria-disabled')).toBe('true');

    toggle.click();
    key(toggle, 'Enter');
    await fixture.whenStable();
    expect(fixture.componentInstance.on()).toBe(false);

    fixture.componentInstance.loading.set(false);
    await fixture.whenStable();
    expect(toggle.hasAttribute('aria-disabled')).toBe(false);
  });

  it('keeps the remove button its own button', async () => {
    const button = get('closable').querySelector<HTMLButtonElement>('.wr-tag__remove')!;
    button.click();
    expect(key(button, 'Enter').defaultPrevented).toBe(false);
    expect(key(button, ' ').defaultPrevented).toBe(false);
    await fixture.whenStable();

    expect(fixture.componentInstance.removed).toEqual(['closable']);
    expect(fixture.componentInstance.closableOn()).toBe(false);
    expect(get('closable').getAttribute('aria-pressed')).toBe('false');
  });

  it('hands the attributes back when selected returns to undefined', async () => {
    const late = get('late');
    expect(late.getAttribute('role')).toBe('status');

    fixture.componentInstance.late.set(true);
    await fixture.whenStable();
    expect(late.getAttribute('role')).toBe('button');
    expect(late.getAttribute('tabindex')).toBe('0');
    expect(late.getAttribute('aria-pressed')).toBe('true');

    fixture.componentInstance.late.set(undefined);
    await fixture.whenStable();
    expect(late.getAttribute('role')).toBe('status');
    expect(late.hasAttribute('tabindex')).toBe(false);
    expect(late.hasAttribute('aria-pressed')).toBe(false);
  });
});
