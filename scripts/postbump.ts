import { writeFileSync } from 'fs';
import { execSync } from 'node:child_process';
import { resolve } from 'path';

(async function main(): Promise<void> {
  const packageJson = await import(resolve(`dist/lib/package.json`));
  const version = packageJson.version;

  writeFileSync(resolve('./projects/showcase/app/_core/version.ts'), `export const NGWR_VERSION = '${version}';\n`, {
    encoding: 'utf-8',
  });
  execSync('git add .');
})();
