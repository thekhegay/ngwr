import { getValueByFlag, hasFlag } from './shared/argv.utils';
import { bumpVersion } from './shared/bump-version';
import { gitPush } from './shared/git-push';
import { makeReleaseBranch } from './shared/make-release-branch';
import { ReleaseMode } from './shared/release-mode';
import { removeLocalReleaseBranch } from './shared/remove-local-release-branch';
import { runCommitAndTagVersion } from './shared/run-commit-and-tag-version';
import { version } from '../projects/lib/package.json';

const ci = hasFlag('--ci-mode');
const mode = getValueByFlag<ReleaseMode>(`--release-as`, `minor`);
const dryRun = getValueByFlag<'false' | 'true'>(`--dry-run`, `false`) === 'true';
const newVersion = bumpVersion(version, mode);

(async function main(): Promise<void> {
  if (ci) {
    runCommitAndTagVersion(newVersion, dryRun);
  } else {
    makeReleaseBranch(newVersion);
    runCommitAndTagVersion(newVersion, dryRun);
    gitPush(newVersion);
    removeLocalReleaseBranch(newVersion);
  }
})();
