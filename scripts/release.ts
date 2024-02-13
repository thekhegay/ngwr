import { getValueByFlag } from './shared/argv.utils';
import { bumpVersion } from './shared/bump-version';
import { ReleaseMode } from './shared/release-mode';
import { runCommitAndTagVersion } from './shared/run-commit-and-tag-version';
import { version } from '../projects/lib/package.json';

const mode = getValueByFlag<ReleaseMode>(`--release-as`, `minor`);
const dryRun = getValueByFlag<'false' | 'true'>(`--dry-run`, `false`) === 'true';
const newVersion = bumpVersion(version, mode);

(async function main(): Promise<void> {
  runCommitAndTagVersion(newVersion, dryRun);
})();
