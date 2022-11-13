import { copyFileSync, writeFileSync } from 'fs';

export function copyAssets(): void {
  const distPath = 'dist/lib';
  copyFileSync('projects/showcase/src/assets/images/logo.svg', `${distPath}/logo.svg`);
  writeFileSync('README.md', `${distPath}/README.md`);
  copyFileSync('LICENSE', `${distPath}/LICENSE`);
}
