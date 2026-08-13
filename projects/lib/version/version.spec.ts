import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';

import { describe, expect, it } from 'vitest';

import { NGWR_VERSION } from './version';
import { NGWR_VERSION_TOKEN } from './version.token';

/**
 * A three-line entry point with one job that nothing else can do for it: keep a
 * hard-coded string in step with `package.json`. `scripts/release-prepare.ts` rewrites
 * both, so the only way they drift is a hand edit to one of them — and nothing about a
 * stale constant looks wrong until a bug report quotes the wrong version.
 *
 * The comparison is with the LIBRARY's manifest, not the workspace root's: they are
 * separate files with separate versions, and reading the wrong one would make this
 * spec pass for the wrong reason.
 */
describe('NGWR_VERSION', () => {
  const manifest = (): { version: string } =>
    JSON.parse(readFileSync(join(process.cwd(), 'projects/lib/package.json'), 'utf8')) as { version: string };

  it('matches the version the package ships as', () => {
    expect(NGWR_VERSION).toBe(manifest().version);
  });

  it('is a plain semver string, with no range or build metadata', () => {
    // A `^` or a `-rc.1` here would reach consumers through the token and read as the
    // installed version. The release script emits a bare number for a stable line.
    expect(NGWR_VERSION).toMatch(/^\d+\.\d+\.\d+(-rc\.\d+)?$/);
  });
});

describe('NGWR_VERSION_TOKEN', () => {
  it('resolves to the constant with nothing configured', () => {
    // `providedIn: 'root'` with a factory, so an app that provides nothing still gets
    // an answer — this is the half a consumer relies on when they put the version in
    // a footer.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    expect(TestBed.inject(NGWR_VERSION_TOKEN)).toBe(NGWR_VERSION);
  });

  it('takes an override, which is the reason it is a token at all', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: NGWR_VERSION_TOKEN, useValue: '0.0.0-local' }] });

    expect(TestBed.inject(NGWR_VERSION_TOKEN)).toBe('0.0.0-local');
  });
});
