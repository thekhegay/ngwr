import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form } from '@angular/forms/signals';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCommentComposer } from './comment-composer';

@Component({
  imports: [WrCommentComposer],
  template: `
    <wr-comment-composer
      [(value)]="draft"
      [placeholder]="placeholder()"
      [ariaLabel]="ariaLabel()"
      [sendLabel]="sendLabel()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [sending]="sending()"
      [enterSends]="enterSends()"
      [clearOnSend]="clearOnSend()"
      (send)="onSend($event)"
      (touch)="touched = touched + 1"
    >
      <button wrComposerActions type="button" class="attach">Attach</button>
    </wr-comment-composer>
  `,
})
class Host {
  readonly composer = viewChild.required(WrCommentComposer);
  readonly draft = signal('');
  readonly placeholder = signal('Message');
  readonly ariaLabel = signal<string | null>(null);
  readonly sendLabel = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly sending = signal(false);
  readonly enterSends = signal(true);
  readonly clearOnSend = signal(true);
  readonly sent: string[] = [];
  touched = 0;
  restoreOnSend = false;

  onSend(text: string): void {
    this.sent.push(text);
    // A failed request putting the text back from inside the handler.
    if (this.restoreOnSend) this.draft.set(text);
  }
}

@Component({
  imports: [FormField, WrCommentComposer],
  template: `<wr-comment-composer placeholder="Reply" [formField]="chat.draft" />`,
})
class SignalFormHost {
  readonly model = signal({ draft: 'from the form' });
  readonly chat = form(this.model);
}

/**
 * The whole point of the composer is what Enter does, and when it must NOT
 * send: the keystroke that commits an IME composition. jsdom fires no
 * composition events, so both of the signals a browser leaves on that keystroke
 * are set by hand, the way `input-otp.spec.ts` does.
 */
describe('WrCommentComposer', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-comment-composer')!;
  const native = (): HTMLTextAreaElement => root().querySelector<HTMLTextAreaElement>('.wr-textarea__native')!;
  const sendButton = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-comment-composer__send')!;

  const type = (text: string): void => {
    native().value = text;
    native().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  const press = (init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init });
    native().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders an autosizing field and a named send button', () => {
    expect(host().classList.contains('wr-comment-composer')).toBe(true);
    expect(root().querySelector('wr-textarea.wr-comment-composer__field')).not.toBeNull();
    expect(native().getAttribute('placeholder')).toBe('Message');
    expect(native().getAttribute('aria-label')).toBe('Message');
    expect(sendButton().getAttribute('aria-label')).toBe('Send');
    expect(sendButton().getAttribute('type')).toBe('button');
  });

  it('takes an explicit field name and an overridable button label', () => {
    fixture.componentInstance.ariaLabel.set('Reply to Ann');
    fixture.componentInstance.sendLabel.set('Отправить');
    fixture.detectChanges();

    expect(native().getAttribute('aria-label')).toBe('Reply to Ann');
    expect(sendButton().getAttribute('aria-label')).toBe('Отправить');
  });

  it('projects extra actions before the send button', () => {
    const actions = root().querySelector('.wr-comment-composer__actions');
    expect(actions?.querySelector('.attach')?.textContent).toBe('Attach');
    // eslint-disable-next-line no-bitwise -- compareDocumentPosition answers with a bitmask
    expect(actions!.compareDocumentPosition(sendButton()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the button disabled while the text is empty or whitespace only', () => {
    expect(sendButton().disabled).toBe(true);
    type('   \n\t');
    expect(sendButton().disabled).toBe(true);
    type('hello');
    expect(sendButton().disabled).toBe(false);
  });

  it('sends the trimmed text on Enter, clears the field first and swallows the keystroke', () => {
    type('  hello there \n');
    const event = press();

    expect(fixture.componentInstance.sent).toEqual(['hello there']);
    expect(fixture.componentInstance.draft()).toBe('');
    expect(native().value).toBe('');
    expect(event.defaultPrevented).toBe(true);
  });

  it('sends through the button too', () => {
    type('from the button');
    sendButton().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.sent).toEqual(['from the button']);
    expect(fixture.componentInstance.draft()).toBe('');
  });

  it('does not send whitespace-only text on Enter, and adds no blank line either', () => {
    type('   ');
    const event = press();

    expect(fixture.componentInstance.sent).toEqual([]);
    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.draft()).toBe('   ');
  });

  it('lets Shift+Enter and Alt+Enter through as a new line', () => {
    type('line');
    for (const init of [{ shiftKey: true }, { altKey: true }]) {
      const event = press(init);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(fixture.componentInstance.sent).toEqual([]);
    expect(fixture.componentInstance.draft()).toBe('line');
  });

  it('sends on Ctrl+Enter and Cmd+Enter whatever Enter itself does', () => {
    type('one');
    press({ ctrlKey: true });
    type('two');
    press({ metaKey: true });

    fixture.componentInstance.enterSends.set(false);
    fixture.detectChanges();
    type('three');
    press({ ctrlKey: true });

    expect(fixture.componentInstance.sent).toEqual(['one', 'two', 'three']);
  });

  it('turns Enter into a new line with [enterSends]="false"', () => {
    fixture.componentInstance.enterSends.set(false);
    fixture.detectChanges();
    type('draft');
    const event = press();

    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.sent).toEqual([]);
  });

  it('ignores an Enter that commits an IME composition', () => {
    type('日本語');
    const event = press({ isComposing: true });

    expect(fixture.componentInstance.sent).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.draft()).toBe('日本語');
  });

  it("recognises Safari's committing keystroke, which carries only keyCode 229", () => {
    type('日本語');
    const event = press({ keyCode: 229 });

    expect(fixture.componentInstance.sent).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores every other key', () => {
    type('text');
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    native().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.sent).toEqual([]);
  });

  it('keeps the text with [clearOnSend]="false"', () => {
    fixture.componentInstance.clearOnSend.set(false);
    fixture.detectChanges();
    type('keep me');
    press();

    expect(fixture.componentInstance.sent).toEqual(['keep me']);
    expect(fixture.componentInstance.draft()).toBe('keep me');
    expect(native().value).toBe('keep me');
  });

  it('lets a handler put the text back at once, through the composer', () => {
    fixture.componentInstance.onSend = text => fixture.componentInstance.composer().value.set(text);
    type('retry me');
    press();

    expect(fixture.componentInstance.draft()).toBe('retry me');
    expect(native().value).toBe('retry me');
  });

  // The bound model written back INSIDE the handler is the trap: the host's
  // `[value]="draft()"` still reads the value Angular last bound, so the input
  // is skipped and the field stays empty while the model says otherwise.
  it('takes a later write to the bound model, once the failure is known', async () => {
    fixture.componentInstance.restoreOnSend = true;
    type('retry me');
    press();
    expect(native().value).toBe('');

    fixture.componentInstance.restoreOnSend = false;
    type('later');
    press();
    await fixture.whenStable();
    fixture.componentInstance.draft.set('later');
    await fixture.whenStable();

    expect(native().value).toBe('later');
  });

  it('blocks sending while sending, marks the host busy and keeps the text', () => {
    fixture.componentInstance.sending.set(true);
    fixture.detectChanges();
    type('queued');
    press();

    expect(host().getAttribute('aria-busy')).toBe('true');
    expect(host().classList.contains('wr-comment-composer--sending')).toBe(true);
    expect(sendButton().disabled).toBe(true);
    expect(native().disabled).toBe(false);
    expect(fixture.componentInstance.sent).toEqual([]);
    expect(fixture.componentInstance.draft()).toBe('queued');

    fixture.componentInstance.sending.set(false);
    fixture.detectChanges();
    expect(host().hasAttribute('aria-busy')).toBe(false);
    press();
    expect(fixture.componentInstance.sent).toEqual(['queued']);
  });

  it('disables the field and the button together, and keeps the text', () => {
    type('held');
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    press();

    expect(host().classList.contains('wr-comment-composer--disabled')).toBe(true);
    expect(native().disabled).toBe(true);
    expect(sendButton().disabled).toBe(true);
    expect(fixture.componentInstance.sent).toEqual([]);
    expect(native().value).toBe('held');
  });

  it('keeps a read-only draft visible, in the tab order and unsendable', () => {
    type('frozen');
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();
    press();

    expect(host().classList.contains('wr-comment-composer--readonly')).toBe(true);
    expect(native().readOnly).toBe(true);
    expect(native().disabled).toBe(false);
    expect(sendButton().disabled).toBe(true);
    expect(fixture.componentInstance.sent).toEqual([]);
    expect(native().value).toBe('frozen');
  });

  it('hands focus back to the field after the button sends', () => {
    type('focus me');
    sendButton().focus();
    sendButton().click();
    fixture.detectChanges();

    expect(document.activeElement).toBe(native());
  });

  it('keeps focus in the field when a pointer presses the button', () => {
    // Safari focuses no button on click, so without this the field just loses focus.
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    sendButton().dispatchEvent(press);

    expect(press.defaultPrevented).toBe(true);
  });

  it('leaves focus where a send handler put it', () => {
    const elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);
    fixture.componentInstance.onSend = () => elsewhere.focus();
    type('moved');
    native().focus();
    press();

    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  it('exposes submit() and focus() for the app', () => {
    const composer = fixture.componentInstance.composer();
    composer.submit();
    expect(fixture.componentInstance.sent).toEqual([]);

    fixture.componentInstance.draft.set('programmatic');
    fixture.detectChanges();
    composer.submit();
    expect(fixture.componentInstance.sent).toEqual(['programmatic']);

    composer.focus();
    expect(document.activeElement).toBe(native());
  });

  it('emits touch when the field blurs', () => {
    native().dispatchEvent(new FocusEvent('focus'));
    native().dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(fixture.componentInstance.touched).toBe(1);
  });

  it('binds to a signal form through [formField]', async () => {
    fixture.destroy();
    const formFixture = TestBed.createComponent(SignalFormHost);
    formFixture.detectChanges();
    await formFixture.whenStable();

    const field = (formFixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>(
      '.wr-textarea__native'
    )!;
    expect(field.value).toBe('from the form');

    field.value = 'typed';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await formFixture.whenStable();

    expect(formFixture.componentInstance.model().draft).toBe('typed');
    formFixture.destroy();
    fixture = TestBed.createComponent(Host);
  });
});
