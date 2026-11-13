import type { ConnectedPosition } from '@angular/cdk/overlay';

import { describe, expect, it } from 'vitest';

import {
  WR_ANCHORED_FALLBACKS,
  WR_ANCHORED_POSITIONS,
  type WrAnchoredPosition,
  wrAnchoredPositions,
} from './wr-anchored-positions';

/**
 * The geometry `wr-popover` has always handed the CDK, written out: the anchor
 * points and its 8px gap. Kept as a literal so a change to the shared table is
 * a change to this file too.
 */
const WITH_8PX_GAP: Record<WrAnchoredPosition, ConnectedPosition> = {
  top: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
  'top-start': { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
  'top-end': { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  bottom: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
  'bottom-start': { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
  'bottom-end': { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  left: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 },
  'left-start': { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -8 },
  'left-end': { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetX: -8 },
  right: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
  'right-start': { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 },
  'right-end': { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: 8 },
};

const names = Object.keys(WR_ANCHORED_POSITIONS) as WrAnchoredPosition[];

describe('wrAnchoredPositions', () => {
  it('knows the twelve placements', () => {
    expect([...names].sort()).toEqual(Object.keys(WITH_8PX_GAP).sort());
    expect(Object.keys(WR_ANCHORED_FALLBACKS).sort()).toEqual([...names].sort());
  });

  it('hands back the fallback chain in order, each link with its own geometry and gap', () => {
    for (const name of names) {
      expect(wrAnchoredPositions(name, { gap: 8 }), name).toEqual(
        WR_ANCHORED_FALLBACKS[name].map(link => WITH_8PX_GAP[link])
      );
    }
  });

  it('carries no offset at all without a gap', () => {
    for (const name of names) {
      const list = wrAnchoredPositions(name);
      WR_ANCHORED_FALLBACKS[name].forEach((link, index) => {
        const bare = { ...WITH_8PX_GAP[link] };
        delete bare.offsetX;
        delete bare.offsetY;
        expect(list[index], `${name} at ${link}`).toEqual(bare);
        expect('offsetX' in list[index] || 'offsetY' in list[index], `${name} at ${link}`).toBe(false);
      });
    }
  });

  it('tags each link with the placement it names, only when given a pane class', () => {
    expect(wrAnchoredPositions('right-start', { paneClass: 'wr-x-overlay' }).map(link => link.panelClass)).toEqual([
      'wr-x-overlay--right-start',
      'wr-x-overlay--left-start',
      'wr-x-overlay--bottom-start',
      'wr-x-overlay--top-start',
    ]);
    expect(wrAnchoredPositions('top').every(link => link.panelClass === undefined)).toBe(true);
  });

  it('returns fresh objects, so a caller can match a link by identity and mutate nothing shared', () => {
    const first = wrAnchoredPositions('bottom-start');
    const second = wrAnchoredPositions('bottom-start');

    expect(first[0]).not.toBe(second[0]);
    expect(first[0]).not.toBe(WR_ANCHORED_POSITIONS['bottom-start']);
  });
});

describe('the anchored fallback chains', () => {
  it('give every placement somewhere to flip to, leading with itself', () => {
    for (const name of names) {
      const chain = WR_ANCHORED_FALLBACKS[name];
      expect(chain.length, `${name} has no fallback`).toBeGreaterThan(1);
      expect(chain[0], `${name} does not lead with itself`).toBe(name);
      expect(new Set(chain).size, `${name} repeats a placement`).toBe(chain.length);
      for (const link of chain) expect(names, `${name} names a placement that does not exist`).toContain(link);
    }
  });

  it('keep the requested alignment down the whole chain', () => {
    const alignment = (name: WrAnchoredPosition): string => name.split('-')[1] ?? '';
    for (const name of names) {
      for (const link of WR_ANCHORED_FALLBACKS[name]) expect(alignment(link)).toBe(alignment(name));
    }
  });

  it('let a side placement reach the block axis, and never send a block one sideways', () => {
    for (const name of names) {
      const chain = WR_ANCHORED_FALLBACKS[name];
      if (/^(left|right)/.test(name)) {
        expect(
          chain.some(link => link.startsWith('bottom')),
          `${name} cannot fall below`
        ).toBe(true);
        expect(
          chain.some(link => link.startsWith('top')),
          `${name} cannot fall above`
        ).toBe(true);
      } else {
        expect(
          chain.every(link => /^(top|bottom)/.test(link)),
          name
        ).toBe(true);
      }
    }
  });
});
