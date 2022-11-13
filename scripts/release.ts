import { version } from '../projects/lib/package.json';
import { getValueByFlag } from './shared/argv.utils';
import { bumpLibVersion } from './shared/bump-lib-version';
import { bumpVersion } from './shared/bump-version';
import { infoLog } from './shared/colored-log';
import { compileIcons } from './shared/compile-icons';
import { gitCommitAndPush } from './shared/git-commit-and-push';
import { makeReleaseBranch } from './shared/make-release-branch';
import { ReleaseMode } from './shared/release-mode';

const mode = getValueByFlag<ReleaseMode>(`--release-as`, `minor`);
const newVersion = bumpVersion(version, mode);

infoLog(JSON.stringify({ mode, newVersion }, null, 4));

(async function main(): Promise<void> {
  makeReleaseBranch(newVersion);
  compileIcons();
  bumpLibVersion(newVersion);
  gitCommitAndPush(newVersion);
})();
