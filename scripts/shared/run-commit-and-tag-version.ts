import { execute } from './execute';

export function runCommitAndTagVersion(version: string, enableDryRun: boolean): void {
  const dryRun = enableDryRun ? '--dry-run' : '';
  execute(`yarn release --release-as ${version} ${dryRun}`);
}
