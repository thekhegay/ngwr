import { readFileSync, writeFileSync } from 'fs';

import { errorLog } from './colored-log';

export function bumpLibVersion(newVersion: string): void {
  const pathToPackageJson = 'projects/lib/package.json';
  const pathToVersion = 'projects/showcase/src/app/@shared/version.ts';
  const packageJson = JSON.parse(readFileSync(`${pathToPackageJson}`).toString());

  if (packageJson.hasOwnProperty('version')) {
    packageJson.version = newVersion;
    writeFileSync(`${pathToPackageJson}`, `${JSON.stringify(packageJson, null, 2)}\n`);
    writeFileSync(`${pathToVersion}`, `export const NGWR_VERSION = \`${newVersion}\`;\n`, {
      encoding: `utf-8`,
    });
  } else {
    errorLog(`No version found in ${pathToPackageJson}`);
    process.exit();
  }
}
