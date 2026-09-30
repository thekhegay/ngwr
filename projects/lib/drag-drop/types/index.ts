/** Payload emitted whenever the user finishes a reorder. */
interface WrSortableReorderEvent<T> {
  /** The new items array after the move. */
  readonly items: readonly T[];
  /** Index the item was dragged from. */
  readonly previousIndex: number;
  /** Index the item was dropped at. */
  readonly currentIndex: number;
  /** Convenience handle for the dropped item. */
  readonly item: T;
}

export type { WrSortableReorderEvent };
