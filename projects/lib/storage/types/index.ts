/**
 * Storage backend. Anything implementing the native `Storage` interface
 * works — `localStorage`, `sessionStorage`, a Map-backed shim, an
 * IndexedDB sync wrapper, an encrypted wrapper, a worker bridge, …
 */
type WrStorageEngine = Storage;

/** {@link WrStorage} configuration. Pass partial — merged with defaults. */
interface WrStorageConfig {
  /**
   * Prefix prepended to every key on read / write. Keeps your app's keys
   * from colliding with third-party libs sharing the same storage.
   * @default ''
   */
  readonly prefix?: string;
  /**
   * Auto JSON-(de)serialize values. Disable to store / read raw strings
   * verbatim (useful when interop with non-ngwr code).
   * @default true
   */
  readonly json?: boolean;
  /**
   * Default TTL in milliseconds applied to every `set()` without a
   * per-call override. `0` means no expiry.
   * @default 0
   */
  readonly ttl?: number;
}

/** Fully-resolved config (all defaults filled). @internal */
type WrStorageConfigResolved = Required<WrStorageConfig>;

/**
 * The **on-disk format** `WrStorage` writes while `json` is on (the default).
 *
 * Public because it is a wire format, not an implementation detail: the value in
 * `localStorage` is `JSON.stringify(envelope)`, so anything reading the same key
 * from outside Angular — a pre-paint theme script in `index.html`, a service
 * worker, a native shell, another framework on the same origin — has to know
 * that a stored `'dark'` is spelled `{"v":"dark"}` and not `"dark"`. Left
 * undocumented, the only way to learn that was to read the bundle.
 *
 * `e` is an absolute expiry in epoch milliseconds, written only when a TTL
 * applies; a value past it reads as absent and is removed on the next `get`.
 * A key holding anything else — a bare JSON value, or a string that is not JSON
 * at all — is returned as it stands, so keys written by non-ngwr code keep
 * working.
 *
 * @example
 * ```jsonc
 * // localStorage['wr-theme']
 * { "v": "dark" }
 * // localStorage['cart'], written with { ttl: 60_000 }
 * { "v": [{ "sku": "a1" }], "e": 1767225600000 }
 * ```
 */
interface WrStorageEnvelope<T = unknown> {
  /** The stored value, as handed to `set()`. */
  readonly v: T;
  /** Absolute expiry, epoch ms. Absent when the write carried no TTL. */
  readonly e?: number;
}

export type { WrStorageEngine, WrStorageConfig, WrStorageConfigResolved, WrStorageEnvelope };
