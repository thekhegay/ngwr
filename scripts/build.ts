import { execSync } from 'node:child_process';

import { copyAssets } from './shared/copy-assets';
import { generateIcons } from './shared/generate-icons';
import { logInfo, logSuccess } from './shared/log';

export function buildLib(): void {
  logInfo({ message: 'Starting building library...', bg: true, break: true });
  const startTime = Date.now();
  generateIcons();
  logInfo({ message: 'Generating library...', break: true });
  execSync(`ng build lib`, { stdio: 'inherit' });
  logSuccess({ message: 'Library generated', bg: true, break: true });
  copyAssets();
  const endTime = Date.now();
  logSuccess({
    message: `Library build in: ${Number((endTime - startTime) / 1000).toFixed(2)}s`,
    bg: true,
    break: true,
  });
}

export function buildShowcase(): void {
  logInfo({ message: 'Starting building showcase...', bg: true, break: true });
  const startTime = Date.now();
  logInfo({ message: 'Generating showcase...', break: true });
  execSync(`ng build showcase`, { stdio: 'inherit' });
  logSuccess({ message: 'Showcase generated', bg: true, break: true });
  const endTime = Date.now();
  logSuccess({
    message: `Showcase build in: ${Number((endTime - startTime) / 1000).toFixed(2)}s`,
    bg: true,
    break: true,
  });
}
