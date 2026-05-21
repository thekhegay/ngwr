import { Injectable, signal } from '@angular/core';

/**
 * Shared state for the docs layout chrome.
 *
 * The header toggles `sidebarOpen`, the sidebar reads it, and the
 * backdrop closes it. Signal-based — no rxjs, no DestroyRef plumbing.
 */
@Injectable({ providedIn: 'root' })
export class LayoutState {
  readonly sidebarOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
