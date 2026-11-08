import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, input } from '@angular/core';

import { DocCodeComponent } from '../doc-code/doc-code';
import type { DocCodeFile } from '../doc-code/types';

import { Confetti } from '#core/effects';
import { PACKAGE_MANAGERS, type PackageManager, SitePackageManager } from '#core/services';

const ADD: Record<PackageManager, { add: string; dev: string }> = {
  pnpm: { add: 'pnpm add', dev: 'pnpm add -D' },
  npm: { add: 'npm install', dev: 'npm install -D' },
  yarn: { add: 'yarn add', dev: 'yarn add -D' },
  bun: { add: 'bun add', dev: 'bun add -d' },
};

/** Set in `sessionStorage` once an install command was copied in this browser session. */
const CELEBRATED_KEY = 'ngwr-install-copied';

/**
 * Claims the one celebration a browser session gets: `true` the first time,
 * `false` after. Storage that is missing or refuses (private mode, a blocked
 * origin) also answers `false`, so a reader whose flag cannot be kept is never
 * showered on every copy.
 */
function claimCelebration(): boolean {
  try {
    if (typeof sessionStorage === 'undefined' || sessionStorage.getItem(CELEBRATED_KEY) !== null) return false;
    sessionStorage.setItem(CELEBRATED_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

/**
 * An install command as one tab per package manager. The choice is shared by
 * every block on the site and remembered. The first command copied in a
 * browser session throws confetti from the copy button; every later copy, and
 * every plain code block, copies quietly.
 *
 * @example
 * ```html
 * <ngwr-doc-install packages="ngwr @angular/cdk" />
 * ```
 */
@Component({
  selector: 'ngwr-doc-install',
  imports: [DocCodeComponent],
  templateUrl: './doc-install.html',
  // A block, so a doc-section gives it the same 1.5rem margin as any other
  // block; an inline host took none.
  styles: ':host { display: block; }',
})
export class DocInstallComponent {
  /** Space-separated package names. */
  readonly packages = input.required<string>();

  /** Install as a dev dependency. */
  readonly dev = input(false);

  protected readonly pm = inject(SitePackageManager);

  private readonly confetti = inject(Confetti);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly files = computed<readonly DocCodeFile[]>(() =>
    PACKAGE_MANAGERS.map(name => ({
      label: name,
      language: 'bash',
      code: `${this.dev() ? ADD[name].dev : ADD[name].add} ${this.packages()}`,
    }))
  );

  /** The copy button was just used: confetti from it, once per browser session. */
  protected celebrate(button: HTMLElement): void {
    if (!this.browser || !claimCelebration()) return;
    this.confetti.burst(button);
  }
}
