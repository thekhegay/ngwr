import { copyFileSync, existsSync } from 'node:fs';

import { logInfo, logSuccess, logWarning } from './log';

export function copyAssets(): void {
  const distPath = 'dist/lib';

  const filesToCopy = ['README.md', 'LICENSE', 'CHANGELOG.md'];

  for (const file of filesToCopy) {
    const src = file;
    const dest = `${distPath}/${file}`;

    if (!existsSync(src)) {
      logWarning({ message: `${src} not found, skipping`, break: true });
      continue;
    }

    logInfo({ message: `Copy ${src}...`, break: true });
    copyFileSync(src, dest);
    logSuccess({ message: `${src} copied`, break: true });
  }
}
