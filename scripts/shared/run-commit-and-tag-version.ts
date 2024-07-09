import { execSync } from 'node:child_process';

export function runCommitAndTagVersion(version: string, enableDryRun: boolean): void {
  const dryRun = enableDryRun ? '--dry-run' : '';
  execSync(`commit-and-tag-version -a --no-verify -t v --release-as ${version} ${dryRun}`, { stdio: 'inherit' });
}
