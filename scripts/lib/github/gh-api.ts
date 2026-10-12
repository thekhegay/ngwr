/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Calls the GitHub REST API through the `gh` CLI and returns its trimmed
 * output. In CI `gh` authenticates with `GH_TOKEN`; locally with its own login.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { LIB_PKG_PATH } from '../paths/lib-pkg';

interface Pkg {
  repository: { url: string };
}

/** `owner/name`, read from the `repository` field the changelog links use too. */
export function repoSlug(): string {
  const { repository } = JSON.parse(readFileSync(LIB_PKG_PATH, 'utf8')) as Pkg;
  const slug = /github\.com\/([^/]+\/[^/.]+)/.exec(repository.url)?.[1];
  if (!slug) throw new Error(`Cannot read a GitHub repository from ${repository.url}`);
  return slug;
}

export function ghApi(args: readonly string[]): string {
  return execFileSync('gh', ['api', ...args], { encoding: 'utf8' }).trim();
}
