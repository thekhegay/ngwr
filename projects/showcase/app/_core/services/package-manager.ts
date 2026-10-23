import { Service, signal } from '@angular/core';

type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

const PACKAGE_MANAGERS: readonly PackageManager[] = ['pnpm', 'npm', 'yarn', 'bun'];

const STORAGE_KEY = 'ngwr-package-manager';

function isPackageManager(value: unknown): value is PackageManager {
  return PACKAGE_MANAGERS.includes(value as PackageManager);
}

function readStored(): PackageManager | null {
  try {
    const value = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    return isPackageManager(value) ? value : null;
  } catch {
    return null;
  }
}

/** The package manager the reader picked in any install block, remembered across pages and visits. */
@Service()
class SitePackageManager {
  readonly current = signal<PackageManager>(readStored() ?? 'pnpm');

  set(value: string | null): void {
    if (!isPackageManager(value)) return;
    this.current.set(value);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // private mode or disabled storage
    }
  }
}

export { PACKAGE_MANAGERS, SitePackageManager, type PackageManager };
