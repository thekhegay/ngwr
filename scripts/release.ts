import { version } from '../package.json';
import { getValueByFlag } from './shared/argv.utils';
import { bumpVersion } from './shared/bump-version';
import { infoLog } from './shared/colored-log';
import { gitCommitAndPush } from './shared/git-commit-and-push';
import { makeReleaseBranch } from './shared/make-release-branch';
import { ReleaseMode } from './shared/release-mode';
import { runStandardVersion } from './shared/run-standard-version';

const mode = getValueByFlag<ReleaseMode>(`--release-as`, `minor`);
const dryRun = getValueByFlag<'true' | 'false'>(`--dry-run`, `false`) === `true`;
const newVersion = bumpVersion(version, mode);

infoLog(JSON.stringify({ mode, newVersion, dryRun }, null, 4));

(async function main(): Promise<void> {
  makeReleaseBranch(newVersion);
  runStandardVersion(newVersion, mode, dryRun);
  gitCommitAndPush(newVersion);
})();
