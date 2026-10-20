import { Component, computed, inject, input } from '@angular/core';

import { DocCodeComponent } from '../doc-code/doc-code';
import type { DocCodeFile } from '../doc-code/types';

import { PACKAGE_MANAGERS, type PackageManager, SitePackageManager } from '#core/services';

const ADD: Record<PackageManager, { add: string; dev: string }> = {
  pnpm: { add: 'pnpm add', dev: 'pnpm add -D' },
  npm: { add: 'npm install', dev: 'npm install -D' },
  yarn: { add: 'yarn add', dev: 'yarn add -D' },
  bun: { add: 'bun add', dev: 'bun add -d' },
};

/**
 * An install command as one tab per package manager. The choice is shared by
 * every block on the site and remembered.
 *
 * @example
 * ```html
 * <ngwr-doc-install packages="ngwr @angular/cdk" />
 * ```
 */
@Component({
  selector: 'ngwr-doc-install',
  imports: [DocCodeComponent],
  template: `<ngwr-doc-code [files]="files()" [tab]="pm.current()" (tabChange)="pm.set($event)" />`,
})
export class DocInstallComponent {
  /** Space-separated package names. */
  readonly packages = input.required<string>();

  /** Install as a dev dependency. */
  readonly dev = input(false);

  protected readonly pm = inject(SitePackageManager);

  protected readonly files = computed<readonly DocCodeFile[]>(() =>
    PACKAGE_MANAGERS.map(name => ({
      label: name,
      language: 'bash',
      code: `${this.dev() ? ADD[name].dev : ADD[name].add} ${this.packages()}`,
    }))
  );
}
