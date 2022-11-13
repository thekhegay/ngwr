import { execSync } from 'child_process';

export function compileIcons(): void {
  execSync(`svg-to-ts-constants`, { stdio: `inherit` });
}
