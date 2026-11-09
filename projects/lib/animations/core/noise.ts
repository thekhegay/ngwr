/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** `n` folded into the lattice's 0..255, for any integer. */
const wrap = (n: number): number => ((n % 256) + 256) % 256;
const fade = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Smooth noise in -1..1, continuous in all three arguments.
 *
 * @internal
 */
export type WrNoise = (x: number, y: number, z: number) => number;

/**
 * A small generator in 0..1, the same run for the same seed: a linear
 * congruence on 2^32, in plain arithmetic, which stays exact under 2^53.
 *
 * @internal
 */
export function seededRandom(seed: number): () => number {
  let state = seed % 4294967296;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Value noise on a lattice shuffled from `seed`: smooth, in -1..1, and the
 * same function every time for the same seed, so a spec can pin a frame. A
 * backdrop that should differ from one page load to the next passes a random
 * seed.
 *
 * @internal
 */
export function createNoise(seed: number): WrNoise {
  const random = seededRandom(seed);
  const order = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const perm = new Uint8Array(512);
  const values = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = order[wrap(i)];
    values[i] = random() * 2 - 1;
  }
  return (x, y, z) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const u = fade(x - xi);
    const v = fade(y - yi);
    const w = fade(z - zi);
    const yw = wrap(yi);
    const zw = wrap(zi);
    const a = perm[wrap(xi)] + yw;
    const b = perm[wrap(xi + 1)] + yw;
    const aa = perm[a] + zw;
    const ab = perm[a + 1] + zw;
    const ba = perm[b] + zw;
    const bb = perm[b + 1] + zw;
    return lerp(
      lerp(lerp(values[aa], values[ba], u), lerp(values[ab], values[bb], u), v),
      lerp(lerp(values[aa + 1], values[ba + 1], u), lerp(values[ab + 1], values[bb + 1], u), v),
      w
    );
  };
}
