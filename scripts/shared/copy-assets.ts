import { copyFile, copyFileSync, readFileSync, writeFileSync } from 'fs';

export function copyAssets(): void {
  const distPath = 'dist/lib';
  copyFileSync('projects/showcase/src/assets/images/logo.svg', `${distPath}/logo.svg`);
  let readmeFile = readFileSync('README.md').toString();
  readmeFile = readmeFile.replace('projects/showcase/src/assets/images/logo.svg', 'logo.svg');
  writeFileSync(`${distPath}/README.md`, readmeFile);
  copyFileSync('LICENSE', `${distPath}/LICENSE`);
}
