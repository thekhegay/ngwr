import { NGWR_VERSION } from 'ngwr/version';

/**
 * What an install or update command on these pages names: `ngwr@next` while
 * the site documents a prerelease, plain `ngwr` once it is stable.
 *
 * A bare `ngwr` resolves npm's `latest` tag, which stays on the previous major
 * for as long as a release candidate is out, so next.ngwr.dev would install a
 * package its own snippets do not compile against. `release:prepare` writes
 * `NGWR_VERSION`, so the stable release reverts this with no edit here.
 */
export const NGWR_PACKAGE = NGWR_VERSION.includes('-') ? 'ngwr@next' : 'ngwr';
