import { execSync } from 'child_process';
import { resolve } from 'path';

import { buildLib } from './shared/build-lib';
import { errorLog, infoLog, processLog, successLog } from './shared/colored-log';
import { compileIcons } from './shared/compile-icons';
import { copyAssets } from './shared/copy-assets';
import { getAllVersions } from './shared/get-all-versions';
import { getLastMajorVersion } from './shared/get-last-major-version';

(async function main(): Promise<void> {
  compileIcons();
  buildLib();
  copyAssets();

  const packageJson = await import(resolve(`dist/lib/package.json`));
  const versions: string[] = getAllVersions(packageJson.name);

  if (versions.includes(packageJson.version)) {
    errorLog(`${packageJson.name}@${packageJson.version} is already published`);
    return;
  }

  infoLog(`name: ${packageJson.name}`);
  infoLog(`version: ${packageJson.version}`);

  const tag = makeTag(packageJson.version, versions);
  const command = `pnpm publish dist/lib/ ${tag} --access public`;

  processLog(command);
  execSync(command, { stdio: `inherit`, encoding: `utf8` });
  successLog(`+${packageJson.name}@${packageJson.version} is published successfully`);
})();

function makeTag(version: string, versions: string[]): string {
  const currentMajor = parseInt(version);
  const maxMajorVersion = getLastMajorVersion(versions, currentMajor);
  return maxMajorVersion > currentMajor ? `--tag v${currentMajor}-lts` : ``;
}
