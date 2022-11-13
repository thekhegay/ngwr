import { readFileSync, writeFileSync } from 'fs';

import { errorLog } from './colored-log';

export function bumpLibVersion(newVersion: string): void {
  const pathToPackageJson = 'projects/lib/package.json';
  const packageJson = JSON.parse(readFileSync(`${pathToPackageJson}`).toString());

  if (packageJson.hasOwnProperty('version')) {
    packageJson.version = newVersion;
    writeFileSync(`${pathToPackageJson}`, `${JSON.stringify(packageJson, null, 2)}\n`);
  } else {
    errorLog(`No version found in ${pathToPackageJson}`);
    process.exit();
  }
}
