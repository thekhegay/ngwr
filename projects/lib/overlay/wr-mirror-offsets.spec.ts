import type { ConnectedPosition } from '@angular/cdk/overlay';

import { describe, expect, it } from 'vitest';

import { wrMirrorOffsets } from './wr-mirror-offsets';

/**
 * The CDK mirrors `originX` / `overlayX` under RTL but adds `offsetX` to the
 * final PHYSICAL x, so a gap that pushed a panel clear of its trigger becomes an
 * overlap once the panel moves to the other side. These cases pin the one rule
 * that fixes: the inline offset flips, and nothing else does.
 */
describe('wrMirrorOffsets', () => {
  const LEFT: ConnectedPosition = {
    originX: 'start',
    originY: 'center',
    overlayX: 'end',
    overlayY: 'center',
    offsetX: -8,
  };

  it('flips the inline offset under rtl', () => {
    expect(wrMirrorOffsets([LEFT], true)[0].offsetX).toBe(8);
  });

  it('leaves the offset alone under ltr', () => {
    expect(wrMirrorOffsets([LEFT], false)[0].offsetX).toBe(-8);
  });

  it('never touches the block axis', () => {
    const below: ConnectedPosition = {
      originX: 'center',
      originY: 'bottom',
      overlayX: 'center',
      overlayY: 'top',
      offsetY: 8,
    };

    // `dir` governs the inline axis only — a panel below its trigger stays below.
    expect(wrMirrorOffsets([below], true)[0].offsetY).toBe(8);
    expect(wrMirrorOffsets([below], true)[0].offsetX).toBeUndefined();
  });

  it('carries the anchors through untouched, because the CDK mirrors those itself', () => {
    const [mirrored] = wrMirrorOffsets([LEFT], true);

    expect([mirrored.originX, mirrored.overlayX]).toEqual(['start', 'end']);
    expect([mirrored.originY, mirrored.overlayY]).toEqual(['center', 'center']);
  });

  it('mirrors every position in a fallback list', () => {
    const fallbacks: ConnectedPosition[] = [
      { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 4 },
      { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -4 },
    ];

    // A submenu's second position is the flip it falls back to when the first
    // runs out of room; leaving it unmirrored would make the fallback the bug.
    expect(wrMirrorOffsets(fallbacks, true).map(p => p.offsetX)).toEqual([-4, 4]);
  });

  it('leaves a position with no inline offset exactly as it was', () => {
    const centred: ConnectedPosition = { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' };

    expect(wrMirrorOffsets([centred], true)[0]).toEqual(centred);
  });

  it("copies rather than writing through the caller's table", () => {
    // The position tables are module-level constants shared by every instance of
    // a component, so a helper that mutated them would corrupt the next one.
    const source: ConnectedPosition[] = [{ ...LEFT }];

    wrMirrorOffsets(source, true);
    expect(source[0].offsetX).toBe(-8);

    expect(wrMirrorOffsets(source, false)[0]).not.toBe(source[0]);
  });
});
