/**
 * What a draggable `role="separator"` does whatever it resizes: the keys that
 * move it, mirrored under RTL, and the pointer capture a drag runs on. Shared
 * by `wr-splitter` and `[wrResizable]`. Not an entry point: this folder has no
 * `public-api.ts`, so the package exports nothing from it. `ngwr/resizable`
 * reaches it by a relative path, and the builder emits it once, as a chunk
 * beside the two bundles.
 */
export { type WrSeparatorKeyMove, wrBeginSeparatorDrag, wrEndSeparatorDrag, wrSeparatorKeyMove } from './separator';
