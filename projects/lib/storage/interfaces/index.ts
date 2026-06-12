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

export type { WrStorageEngine, WrStorageConfig, WrStorageConfigResolved };
