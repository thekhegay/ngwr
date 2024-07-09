import { execSync } from 'child_process';
import { resolve } from 'node:path';

import { buildLib } from './build';
import { getVersions } from './shared/get-versions';
import { logError, logSuccess } from './shared/log';

(async function main(): Promise<void> {
  buildLib();

  const packageJson = await import(resolve(`dist/lib/package.json`));
  const versions = getVersions(packageJson.name);

  if (versions.includes(packageJson.version)) {
    logError({ message: `${packageJson.name}@${packageJson.version} is already published`, bg: true });
    return;
  }

  execSync(`pnpm publish dist/lib/ --access public`, { stdio: `inherit`, encoding: `utf8` });
  logSuccess({ message: `+${packageJson.name}@${packageJson.version} is published successfully`, bg: true });
})();
