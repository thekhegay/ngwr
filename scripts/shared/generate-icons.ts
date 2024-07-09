import { execSync } from 'node:child_process';

import { logInfo, logSuccess } from './log';

export function generateIcons(): void {
  logInfo({ message: 'NGWR icons generating...', break: true });
  execSync(`ng run lib:generate-icons`, { stdio: 'inherit' });
  logSuccess({ message: 'NGWR icons generated', break: true });
}
