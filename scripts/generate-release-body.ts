import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getArgv } from './shared/get-argv';

const specialCharactersRegExp = /[.*+?^${}()|[\]\\]/g;

function escapeRegExp(value: string): string {
  return value.replace(specialCharactersRegExp, '\\$&');
}

function readChangelogSection(version: string, changelog: string): string {
  const versionPattern = new RegExp(`(^##\\s+${escapeRegExp(version)}[^\\n]*\\n(?:[\\s\\S]*?))(?=^##\\s+\\d|\\Z)`, 'm');
  const match = changelog.match(versionPattern);

  if (!match) {
    throw new Error(`Unable to find changelog entry for version ${version}`);
  }

  return match[1].trimEnd();
}

(function main(): void {
  const output = getArgv('--output', '');
  const changelogPath = resolve('./CHANGELOG.md');
  const libraryPackageJsonPath = resolve('./projects/lib/package.json');
  const libraryPackageJson = JSON.parse(readFileSync(libraryPackageJsonPath, 'utf-8')) as { version: string };

  const version = libraryPackageJson.version;
  const changelog = readFileSync(changelogPath, 'utf-8');
  const releaseBody = readChangelogSection(version, changelog);

  if (output && output !== 'true') {
    writeFileSync(resolve(output), `${releaseBody}\n`, 'utf-8');
    return;
  }

  process.stdout.write(releaseBody);
})();
