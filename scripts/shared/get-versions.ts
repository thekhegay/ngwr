import { execSync } from 'node:child_process';

export function getVersions(packageName: string): string[] {
  const npmVersions = execSync(`pnpm view ${packageName} versions --json`);
  return JSON.parse(npmVersions.toString());
}
