import { copyFileSync } from 'node:fs';

import { logInfo, logSuccess } from './log';

export function copyAssets(): void {
  const distPath = 'dist/lib';

  logInfo({ message: `Copy README.md...`, break: true });
  copyFileSync('README.md', `${distPath}/README.md`);
  logSuccess({ message: `README.md copied`, break: true });

  logInfo({ message: `Copy LICENSE...`, break: true });
  copyFileSync('LICENSE', `${distPath}/LICENSE`);
  logSuccess({ message: `LICENSE copied`, break: true });
}
