import { Component, ViewEncapsulation, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrCommandPalette, type WrCommandItem } from 'ngwr/command-palette';
import { WrContextMenu, WrContextMenuItem, WrContextMenuPanel } from 'ngwr/context-menu';
import { WrDrawer, WrDrawerClose, WrDrawerContent, WrDrawerFooter, WrDrawerTitle } from 'ngwr/drawer';
import { WrPopconfirm } from 'ngwr/popconfirm';
import { WrPopover } from 'ngwr/popover';
import { WrTheme } from 'ngwr/theme';
import { WrToast } from 'ngwr/toast';

/** The sandbox host. Everything below is a docs snippet, copied as written. */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [
    WrButton,
    WrCommandPalette,
    WrContextMenu,
    WrContextMenuItem,
    WrContextMenuPanel,
    WrDrawer,
    WrDrawerClose,
    WrDrawerContent,
    WrDrawerFooter,
    WrDrawerTitle,
    WrPopconfirm,
    WrPopover,
  ],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);
  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }

  private readonly toast = inject(WrToast);

  protected readonly open = signal(false);

  protected readonly commands: readonly WrCommandItem[] = [
    { id: 'new', label: 'New file' },
    { id: 'open', label: 'Open…' },
  ];

  protected notify(): void {
    this.toast.show({ message: 'Saved', type: 'success' });
  }

  protected remove(): void {
    this.toast.show({ message: 'Deleted', type: 'danger' });
  }
}
