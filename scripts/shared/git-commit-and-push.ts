import { execSync } from 'child_process';

export function gitCommitAndPush(newVersion: string): void {
  execSync(`git add .`);
  execSync(`git push --set-upstream origin release/${newVersion}`, { stdio: `inherit` });
  execSync(`git push --tags`, { stdio: `inherit` });
}
