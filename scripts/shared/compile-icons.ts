import { execSync } from 'child_process';

export function compileIcons(): void {
  execSync(`pnpm generate:icons`, { stdio: `inherit` });
}
