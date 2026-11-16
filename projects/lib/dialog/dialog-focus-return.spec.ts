import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrContextMenu, WrContextMenuItem, WrContextMenuPanel } from 'ngwr/context-menu';
import { WrPopconfirm } from 'ngwr/popconfirm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDialog } from './dialog';
import { WrDialogClose } from './directives';

@Component({
  imports: [WrDialogClose],
  template: `<button type="button" wrDialogClose>Close</button>`,
})
class Body {}

@Component({
  imports: [WrContextMenu, WrContextMenuPanel, WrContextMenuItem, WrPopconfirm],
  template: `
    <div class="region" [wrContextMenu]="menu">Region</div>
    <wr-context-menu #menu>
      <wr-context-menu-item (click)="openDialog()">Open</wr-context-menu-item>
    </wr-context-menu>
    <button type="button" class="ask" wrPopconfirm="Sure?" (confirmed)="openDialog()">Ask</button>
  `,
})
class Host {
  private readonly dialog = inject(WrDialog);
  ref: ReturnType<WrDialog['open']> | null = null;

  openDialog(): void {
    this.ref = this.dialog.open(Body);
  }
}

describe('dialog focus return after a transient opener', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const el = (selector: string): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector(selector)!;
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.tick();
    await fixture.whenStable();
  };

  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 });
    Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 });
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 120, 32),
    ] as unknown as DOMRectList);
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(document.documentElement, 'clientWidth');
    Reflect.deleteProperty(document.documentElement, 'clientHeight');
    fixture.destroy();
  });

  it('returns to the menu region when the dialog was opened from a menu item', async () => {
    el('.region').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    const item = document.querySelector<HTMLElement>('[role="menuitem"]')!;
    item.focus();
    item.click();
    await settle();
    await new Promise(resolve => setTimeout(resolve, 300));
    await settle();
    expect(item.isConnected).toBe(false);

    fixture.componentInstance.ref!.close();
    await settle();

    expect(document.activeElement).toBe(el('.region'));
  });

  it('returns to the popconfirm trigger when the dialog was opened from its confirm button', async () => {
    el('.ask').click();
    fixture.detectChanges();
    await settle();
    const confirm = document.querySelectorAll<HTMLElement>('.wr-popconfirm wr-btn')[1];
    confirm.focus();
    confirm.click();
    await settle();
    expect(confirm.isConnected).toBe(false);

    fixture.componentInstance.ref!.close();
    await settle();

    expect(document.activeElement).toBe(el('.ask'));
  });
});
