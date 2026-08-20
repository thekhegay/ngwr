import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

import type { SandboxRequest } from './types';

/**
 * Opens a docs snippet as a running Angular app on StackBlitz.
 *
 * The service is the whole public surface of `#core/sandbox`: a page hands it
 * the same source it already renders in `<ngwr-doc-code>`, and gets a tab with
 * ngwr installed. Nothing else here needs to be imported by a page.
 *
 * Everything expensive — the generated selector map, the project builder — is
 * behind the dynamic import in {@link open}. That is not only about bundle
 * size: `<ngwr-doc-snippet>` renders on ~200 prerendered pages, and a builder
 * that were statically imported would be evaluated in Node during every one of
 * them for a button that cannot be clicked there.
 *
 * @example
 * ```ts
 * private readonly sandbox = inject(SandboxService);
 *
 * protected try(): void {
 *   void this.sandbox.open({ title: 'Select — multi', files: [{ label: 'HTML', language: 'html', code }] });
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class SandboxService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly pending = signal(false);

  /** True while a project is being built. Drives the button's busy state. */
  readonly busy = this.pending.asReadonly();

  /**
   * Warm the sandbox chunk before it is needed — call it on hover or focus.
   *
   * Not an optimisation for its own sake. {@link open} awaits a dynamic import
   * before submitting a form to a new tab, and a browser only allows that while
   * the click's transient activation lasts (about five seconds in Chrome). On a
   * slow connection the chunk can outlive it and the tab is silently blocked,
   * which looks exactly like a broken button. Fetching on hover means the
   * click resolves an already-loaded module.
   */
  preload(): void {
    if (!this.isBrowser) return;
    void import('./open');
  }

  /**
   * Build the project and hand it to StackBlitz in a new tab.
   *
   * Resolves once the form has been submitted. A snippet that cannot be wired
   * up still opens — as a workspace showing its own source and the reason —
   * so there is no failure path for a caller to handle beyond the import
   * itself.
   */
  async open(request: SandboxRequest): Promise<void> {
    if (!this.isBrowser) return;

    this.pending.set(true);
    try {
      const { openSandbox } = await import('./open');
      openSandbox(request);
    } finally {
      this.pending.set(false);
    }
  }
}
