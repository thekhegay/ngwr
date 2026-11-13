import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrAlert, type WrAlertType } from 'ngwr/alert';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrAlertHarness } from './wr-alert-harness';

@Component({
  imports: [WrAlert],
  template: `
    <wr-alert
      [title]="title()"
      [message]="message()"
      [type]="type()"
      [icon]="icon()"
      [closable]="closable()"
      (closed)="closes = closes + 1"
    >
      Request 8f2c41 timed out.
      <button wrAlertActions type="button">Retry</button>
    </wr-alert>
    <wr-alert title="Saved" type="success" />
  `,
})
class Host {
  readonly title = signal<string | null>('Sync failed');
  readonly message = signal<string | null>('The server did not answer.');
  readonly type = signal<WrAlertType>('danger');
  readonly icon = signal(true);
  readonly closable = signal(true);
  closes = 0;
}

describe('WrAlertHarness', () => {
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

  it('reads the headline, the message, the content and the whole text', async () => {
    const alert = await loader.getHarness(WrAlertHarness);

    expect(await alert.getTitle()).toBe('Sync failed');
    expect(await alert.getMessage()).toBe('The server did not answer.');
    expect(await alert.getContentText()).toBe('Request 8f2c41 timed out.');
    expect(await alert.getText()).toBe('Sync failed The server did not answer. Request 8f2c41 timed out. Retry');
  });

  it('answers a lone message as the headline, where the component draws it', async () => {
    const alert = await loader.getHarness(WrAlertHarness);

    fixture.componentInstance.title.set(null);
    await fixture.whenStable();

    expect(await alert.getTitle()).toBe('The server did not answer.');
    expect(await alert.getMessage()).toBeNull();
  });

  it('reads the variant and how it is announced', async () => {
    const alert = await loader.getHarness(WrAlertHarness);
    expect([await alert.getType(), await alert.getRole(), await alert.getLiveLevel()]).toEqual([
      'danger',
      'alert',
      'assertive',
    ]);

    fixture.componentInstance.type.set('info');
    await fixture.whenStable();

    expect([await alert.getType(), await alert.getRole(), await alert.getLiveLevel()]).toEqual([
      'info',
      'status',
      'polite',
    ]);
  });

  it('refuses to name a variant the host does not carry', async () => {
    const alert = await loader.getHarness(WrAlertHarness);
    (fixture.nativeElement as HTMLElement).querySelector('wr-alert')!.classList.remove('wr-alert--danger');

    await expect(alert.getType()).rejects.toThrow(/no wr-alert--<type> modifier/);
  });

  it('reports the icon', async () => {
    const alert = await loader.getHarness(WrAlertHarness);
    expect(await alert.hasIcon()).toBe(true);

    fixture.componentInstance.icon.set(false);
    await fixture.whenStable();

    expect(await alert.hasIcon()).toBe(false);
  });

  it('closes through the button, once, and says it is dismissed', async () => {
    const alert = await loader.getHarness(WrAlertHarness);
    expect([await alert.isClosable(), await alert.getCloseLabel(), await alert.isDismissed()]).toEqual([
      true,
      'Close alert',
      false,
    ]);

    await alert.close();

    expect(fixture.componentInstance.closes).toBe(1);
    expect(await alert.isDismissed()).toBe(true);
    // The host stays and renders nothing, so every reader answers empty.
    expect([await alert.getTitle(), await alert.getText(), await alert.getRole(), await alert.isClosable()]).toEqual([
      null,
      '',
      null,
      false,
    ]);
    await expect(alert.close()).rejects.toThrow(/no close button/);
  });

  it('refuses to close an alert that is not closable', async () => {
    fixture.componentInstance.closable.set(false);
    await fixture.whenStable();
    const alert = await loader.getHarness(WrAlertHarness);

    expect(await alert.isClosable()).toBe(false);
    expect(await alert.getCloseLabel()).toBeNull();
    await expect(alert.close()).rejects.toThrow(/not `closable`/);
    expect(fixture.componentInstance.closes).toBe(0);
  });

  it('narrows by title, text, type and closable', async () => {
    const titles = async (filters: Parameters<typeof WrAlertHarness.with>[0]): Promise<(string | null)[]> =>
      Promise.all((await loader.getAllHarnesses(WrAlertHarness.with(filters))).map(alert => alert.getTitle()));

    expect(await titles({})).toEqual(['Sync failed', 'Saved']);
    expect(await titles({ title: 'Saved' })).toEqual(['Saved']);
    expect(await titles({ text: /timed out/ })).toEqual(['Sync failed']);
    expect(await titles({ type: 'success' })).toEqual(['Saved']);
    expect(await titles({ closable: true })).toEqual(['Sync failed']);
    expect(await titles({ closable: false })).toEqual(['Saved']);
  });
});
