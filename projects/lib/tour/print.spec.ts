import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../spec-sass';

describe('the tour print sheet', { timeout: COMPILE_TIMEOUT }, () => {
  it('hides the open overlay with a selector that beats the CDK pane display', () => {
    const css = compileSass(`@use 'tour/styles';`).replace(/\s+/g, ' ');
    const print = css.slice(css.indexOf('@media print'));

    expect(print).toMatch(/\.cdk-overlay-pane\.wr-tour-overlay\b[^{]*\{ display: none;/);
  });
});
