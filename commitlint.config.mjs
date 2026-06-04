// @ts-check

/**
 * Conventional Commits with the type allowlist used by our PR-title GH
 * Action (`amannn/action-semantic-pull-request@v6`) so local commit
 * messages and PR titles stay in lockstep.
 *
 * Wired via `simple-git-hooks` (see `package.json`'s `simple-git-hooks`
 * field). Fires on every `git commit` via the `commit-msg` hook.
 */
/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    // Subject is preferred lowercase to match the showcase PR-title rule.
    'subject-case': [2, 'always', 'lower-case'],
    // Conventional default is 100; ours is tighter to match the
    // "short single-line commit" house style.
    'header-max-length': [2, 'always', 100],
  },
};
