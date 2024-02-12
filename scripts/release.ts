import { getValueByFlag } from './shared/argv.utils';
import { bumpVersion } from './shared/bump-version';
import { gitCommitAndPush } from './shared/git-commit-and-push';
import { makeReleaseBranch } from './shared/make-release-branch';
import { ReleaseMode } from './shared/release-mode';
import { removeLocalReleaseBranch } from './shared/remove-local-release-branch';
import { runCommitAndTagVersion } from './shared/run-commit-and-tag-version';
import { version } from '../projects/lib/package.json';

const mode = getValueByFlag<ReleaseMode>(`--release-as`, `minor`);
const dryRun = getValueByFlag<'false' | 'true'>(`--dry-run`, `false`) === 'true';
const newVersion = bumpVersion(version, mode);

(async function main(): Promise<void> {
  makeReleaseBranch(newVersion);
  runCommitAndTagVersion(newVersion, dryRun);
  gitCommitAndPush(newVersion);
  removeLocalReleaseBranch(newVersion);
})();
