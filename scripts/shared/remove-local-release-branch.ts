import { execSync } from 'child_process';

export function removeLocalReleaseBranch(newVersion: string): void {
  execSync(`git checkout main`, { stdio: `inherit` });
  execSync(`git pull`, { stdio: `inherit` });
  execSync(`git branch -d release/${newVersion}`, { stdio: `inherit` });
}
