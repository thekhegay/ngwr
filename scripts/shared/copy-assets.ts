import { copyFileSync } from 'fs';

export function copyAssets(): void {
  const distPath = 'dist/lib';
  copyFileSync('README.md', `${distPath}/README.md`);
  copyFileSync('LICENSE', `${distPath}/LICENSE`);
}
