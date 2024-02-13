import { execute } from './execute';

export function runCommitAndTagVersion(version: string, enableDryRun: boolean): void {
  const dryRun = enableDryRun ? '--dry-run' : '';
  execute(`commit-and-tag-version -a --no-verify -t v --release-as ${version} ${dryRun}`);
}
