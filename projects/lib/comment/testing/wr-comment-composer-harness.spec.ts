import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCommentComposer } from 'ngwr/comment';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCommentComposerHarness } from './wr-comment-composer-harness';

@Component({
  imports: [WrCommentComposer],
  template: `
    <wr-comment-composer
      placeholder="Message"
      [(value)]="draft"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [sending]="sending()"
      [clearOnSend]="clearOnSend()"
      (send)="sent.push($event)"
    />
    <wr-comment-composer placeholder="Reply" sendLabel="Post reply" />
  `,
})
class Host {
  readonly draft = signal('');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly sending = signal(false);
  readonly clearOnSend = signal(true);
  readonly sent: string[] = [];
}

/**
 * Used exactly as a consumer would: through the loader, with nothing reached
 * into. "Did it send" is read off the host's own `(send)` list, because the
 * composer keeps no record of its own.
 */
describe('WrCommentComposerHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds a composer by placeholder, value and disabled state', async () => {
    expect(await loader.getAllHarnesses(WrCommentComposerHarness)).toHaveLength(2);

    const reply = await loader.getHarness(WrCommentComposerHarness.with({ placeholder: 'Reply' }));
    expect(await reply.getSendLabel()).toBe('Post reply');

    fixture.componentInstance.draft.set('hello');
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await loader.getAllHarnesses(WrCommentComposerHarness.with({ value: 'hello' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrCommentComposerHarness.with({ disabled: true }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrCommentComposerHarness.with({ disabled: false }))).toHaveLength(1);
  });

  it('reads the placeholder and the catalog send label', async () => {
    const composer = await loader.getHarness(WrCommentComposerHarness.with({ placeholder: 'Message' }));

    expect(await composer.getPlaceholder()).toBe('Message');
    expect(await composer.getSendLabel()).toBe('Send');
    expect(await (await composer.getField()).getPlaceholder()).toBe('Message');
  });

  it('types a draft, which the model hears, and gates the button on it', async () => {
    const composer = await loader.getHarness(WrCommentComposerHarness.with({ placeholder: 'Message' }));
    expect(await composer.canSend()).toBe(false);

    await composer.setValue('on my way');

    expect(await composer.getValue()).toBe('on my way');
    expect(fixture.componentInstance.draft()).toBe('on my way');
    expect(await composer.canSend()).toBe(true);
  });

  it('sends through the button and clears the draft', async () => {
    const composer = await loader.getHarness(WrCommentComposerHarness.with({ placeholder: 'Message' }));
    await composer.setValue('  by button  ');
    await composer.send();

    expect(fixture.componentInstance.sent).toEqual(['by button']);
    expect(await composer.getValue()).toBe('');
    expect(await composer.canSend()).toBe(false);
  });

  it('sends on Enter, and keeps the draft with clearOnSend off', async () => {
    const composer = await loader.getHarness(WrCommentComposerHarness.with({ placeholder: 'Message' }));
    await composer.setValue('by enter');
    await composer.pressEnter();

    expect(fixture.componentInstance.sent).toEqual(['by enter']);
    expect(await composer.getValue()).toBe('');

    fixture.componentInstance.clearOnSend.set(false);
    await fixture.whenStable();
    await composer.setValue('kept');
    await composer.pressEnter();

    expect(fixture.componentInstance.sent).toEqual(['by enter', 'kept']);
    expect(await composer.getValue()).toBe('kept');
  });

  it('refuses to click a disabled button, and says why', async () => {
    const composer = await loader.getHarness(WrCommentComposerHarness.with({ placeholder: 'Message' }));

    await expect(composer.send()).rejects.toThrow(/draft is empty/);

    await composer.setValue('ready');
    fixture.componentInstance.sending.set(true);
    await fixture.whenStable();

    expect(await composer.isSending()).toBe(true);
    expect(await composer.canSend()).toBe(false);
    await expect(composer.send()).rejects.toThrow(/sending/);
    await composer.pressEnter();
    expect(fixture.componentInstance.sent).toEqual([]);
    expect(await composer.getValue()).toBe('ready');
  });

  it('reports disabled and read-only off the native element', async () => {
    const composer = await loader.getHarness(WrCommentComposerHarness.with({ placeholder: 'Message' }));
    expect([await composer.isDisabled(), await composer.isReadonly()]).toEqual([false, false]);

    fixture.componentInstance.readonly.set(true);
    await fixture.whenStable();
    expect(await composer.isReadonly()).toBe(true);
    await expect(composer.setValue('x')).rejects.toThrow(/read-only/);

    fixture.componentInstance.readonly.set(false);
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(await composer.isDisabled()).toBe(true);
    expect(await composer.canSend()).toBe(false);
  });

  it('moves focus into the field', async () => {
    const composer = await loader.getHarness(WrCommentComposerHarness.with({ placeholder: 'Message' }));
    expect(await composer.isFocused()).toBe(false);

    await composer.focus();

    expect(await composer.isFocused()).toBe(true);
  });
});
