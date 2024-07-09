import { resolve } from 'node:path';

import { buildLib } from './build';
import { getArgv } from './shared/argv';
import { bumpVersion } from './shared/bump-version';
import { ReleaseMode } from './shared/release-mode';
import { runCommitAndTagVersion } from './shared/run-commit-and-tag-version';

(async function main(): Promise<void> {
  buildLib();

  const mode = getArgv<ReleaseMode>(`--release-as`, `patch`);
  const dryRun = getArgv<'false' | 'true'>(`--dry-run`, `false`) === 'true';
  const packageJson = await import(resolve(`dist/lib/package.json`));
  const newVersion = bumpVersion(packageJson.version, mode);

  runCommitAndTagVersion(newVersion, dryRun);
})();
