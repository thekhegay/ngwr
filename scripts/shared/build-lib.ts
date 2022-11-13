import { execSync } from 'child_process';

export function buildLib(): void {
  execSync(`nx build lib`, { stdio: `inherit` });
}
