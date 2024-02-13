import { writeFileSync } from 'fs';
import { resolve } from 'path';

import { execute } from './shared/execute';
import { version } from '../projects/lib/package.json';

(function main(): void {
  writeFileSync(
    resolve('./projects/showcase/src/app/@shared/version.ts'),
    `export const NGWR_VERSION = '${version}';\n`,
    {
    encoding: 'utf-8',
  });
  execute('git add .');
})();
