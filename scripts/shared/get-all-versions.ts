import { execSync } from 'child_process';

export function getAllVersions(name: string): string[] {
  return JSON.parse(execSync(`pnpm view ${name} versions --json || echo "[]"`).toString());
}
