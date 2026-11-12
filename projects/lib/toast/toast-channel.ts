/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Service, inject, signal } from '@angular/core';

import { WR_TOAST_CONFIG } from './tokens';
import type { WrToastOptions } from './types';

/** A toast in a channel, with the bookkeeping its countdown needs. */
export type WrToastEntry = WrToastOptions & {
  readonly id: number;
  /** Auto-dismiss duration in ms after merging with the config. */
  readonly resolvedDuration: number;
  timer?: ReturnType<typeof setTimeout>;
  /** Timestamp of the last timer (re)start, used to compute remaining on pause. */
  startedAt?: number;
  /** Milliseconds left when paused. */
  remaining: number;
};

/**
 * One independent stack of toasts: the global one, or an outlet's.
 *
 * At most one pending timer per visible toast, and every operation is
 * O(`maxStack`), however many toasts have passed through.
 *
 * @internal
 */
export class WrToastChannel {
  /** The rendered toasts, capped at `maxStack`. */
  readonly toasts = signal<readonly WrToastEntry[]>([]);
  /** How many wait behind the cap. */
  readonly queued = signal(0);

  private queue: WrToastEntry[] = [];
  /** The pointer or focus is inside the host: no countdown runs, a toast that
   * arrives meanwhile included. See `WrToastHost.syncHold`. */
  private held = false;
  /** Outlets rendering this channel. */
  private mounts = 0;

  /**
   * @param expire called when a toast's countdown runs out
   * @param drops past the cap the oldest toast is dropped; otherwise the newest waits in a queue
   * @param live `false` until an outlet mounts: a toast nobody can see does not count down
   */
  constructor(
    private readonly expire: (id: number) => void,
    private readonly drops: boolean,
    private live: boolean,
    public maxStack: number,
    public duration: number
  ) {}

  get empty(): boolean {
    return this.toasts().length === 0 && this.queue.length === 0;
  }

  find(id: number): WrToastEntry | undefined {
    return this.toasts().find(t => t.id === id);
  }

  add(entry: WrToastEntry): void {
    const max = this.maxStack;
    const active = this.toasts();
    if (max <= 0 || active.length < max) {
      this.toasts.set([...active, entry]);
    } else if (this.drops && this.held) {
      // What the user is reading stays. The arrivals wait, bounded like the
      // stack, and enter on release.
      if (this.queue.length >= max) this.queue.shift();
      this.queue.push(entry);
      this.queued.set(this.queue.length);
      return;
    } else if (this.drops) {
      // Straight out of the array, with no exit to run.
      const kept = active.length - max + 1;
      for (let i = 0; i < kept; i++) this.stopTimer(active[i]);
      this.toasts.set([...active.slice(kept), entry]);
    } else {
      // No timer until it is shown.
      this.queue.push(entry);
      this.queued.set(this.queue.length);
      return;
    }
    this.startTimer(entry);
  }

  /** Whether the toast was in this channel, visible or queued. */
  remove(id: number): boolean {
    const active = this.toasts();
    const entry = active.find(t => t.id === id);
    const queuedAt = entry ? -1 : this.queue.findIndex(t => t.id === id);
    if (!entry && queuedAt < 0) return false;
    if (entry) {
      this.stopTimer(entry);
      this.toasts.set(active.filter(t => t !== entry));
    } else {
      this.queue.splice(queuedAt, 1);
    }
    this.promote();
    // The host goes with its last toast, and takes the pointer's hold with it.
    if (this.empty) this.held = false;
    return true;
  }

  clear(): void {
    for (const entry of this.toasts()) this.stopTimer(entry);
    this.toasts.set([]);
    this.queue = [];
    this.queued.set(0);
    this.held = false;
  }

  pause(id: number): void {
    const entry = this.find(id);
    if (entry) this.pauseTimer(entry);
  }

  resume(id: number): void {
    const entry = this.find(id);
    if (entry) this.startTimer(entry);
  }

  setHeld(held: boolean): void {
    this.held = held;
    if (!held) this.release();
    this.syncTimers();
  }

  /** An outlet's own cap and default duration. A lower cap drops the oldest at once. */
  configure(maxStack: number, duration: number): void {
    this.maxStack = maxStack;
    this.duration = duration;
    const active = this.toasts();
    if (!this.drops || maxStack <= 0 || active.length <= maxStack) return;
    const over = active.length - maxStack;
    for (let i = 0; i < over; i++) this.stopTimer(active[i]);
    this.toasts.set(active.slice(over));
  }

  /** How many outlets render the channel after this one joined. */
  mount(): number {
    this.mounts++;
    this.live = true;
    this.syncTimers();
    return this.mounts;
  }

  unmount(): void {
    if (--this.mounts > 0) return;
    this.live = false;
    this.held = false;
    this.release();
    this.syncTimers();
  }

  /** Let in what arrived during a hold, in arrival order, the oldest toasts making room. */
  private release(): void {
    if (!this.drops || this.queue.length === 0) return;
    const all = [...this.toasts(), ...this.queue];
    const over = this.maxStack > 0 ? Math.max(0, all.length - this.maxStack) : 0;
    for (let i = 0; i < over; i++) this.stopTimer(all[i]);
    this.queue = [];
    this.queued.set(0);
    this.toasts.set(all.slice(over));
  }

  private syncTimers(): void {
    const running = this.live && !this.held;
    for (const entry of this.toasts()) {
      if (running) this.startTimer(entry);
      else this.pauseTimer(entry);
    }
  }

  /** Fill free slots from the queue, FIFO; a countdown starts as its toast becomes visible. */
  private promote(): void {
    const max = this.maxStack;
    const promoted: WrToastEntry[] = [];
    while (this.queue.length > 0 && (max <= 0 || this.toasts().length + promoted.length < max)) {
      promoted.push(this.queue.shift()!);
    }
    if (promoted.length === 0) return;
    this.toasts.update(active => [...active, ...promoted]);
    this.queued.set(this.queue.length);
    for (const entry of promoted) this.startTimer(entry);
  }

  private startTimer(entry: WrToastEntry): void {
    // Never a second timer for one entry: a toast's own pause and the host's
    // hold both resume, and whichever comes second finds the clock running.
    if (entry.remaining <= 0 || entry.timer || this.held || !this.live) return;
    entry.startedAt = Date.now();
    entry.timer = setTimeout(() => this.expire(entry.id), entry.remaining);
  }

  private pauseTimer(entry: WrToastEntry): void {
    if (!entry.timer) return;
    this.stopTimer(entry);
    if (entry.startedAt) {
      entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
    }
  }

  private stopTimer(entry: WrToastEntry): void {
    if (!entry.timer) return;
    clearTimeout(entry.timer);
    entry.timer = undefined;
  }
}

/**
 * The outlet channels, by name. A channel outlives its outlet, so a toast sent
 * before the outlet is in the page waits for it.
 *
 * @internal
 */
@Service()
export class WrToastChannels {
  private readonly config = inject(WR_TOAST_CONFIG);
  private readonly channels = new Map<string, WrToastChannel>();

  get(name: string): WrToastChannel {
    let channel = this.channels.get(name);
    if (!channel) {
      channel = new WrToastChannel(id => channel?.remove(id), true, false, this.config.maxStack, this.config.duration);
      this.channels.set(name, channel);
    }
    return channel;
  }

  /** Remove the toast from whichever channel holds it. */
  remove(id: number): void {
    for (const channel of this.channels.values()) {
      if (channel.remove(id)) return;
    }
  }
}
