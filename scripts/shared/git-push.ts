import { execSync } from 'child_process';

export function gitPush(newVersion: string): void {
  execSync(`git push --set-upstream origin release/${newVersion}`, { stdio: `inherit` });
  execSync(`git push --tags`, { stdio: `inherit` });
}
