import { execSync } from 'child_process';

export function buildLib(): void {
  execSync(`ng build lib`, { stdio: `inherit` });
}
