import type { WrSortableList } from '../sortable-list';

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

/** One end of a move between connected lists: the list and the index in it. */
interface WrSortableMoveEnd<T> {
  /** The list. Tell it apart by its `id` input, or by comparing the instance. */
  readonly list: WrSortableList<T>;
  /** Index in that list's `items`. */
  readonly index: number;
}

/** Payload emitted by the TARGET list when an item arrives from another list of its group. */
interface WrSortableMoveEvent<T> {
  /** The item that moved. */
  readonly item: T;
  /** Where it left. */
  readonly from: WrSortableMoveEnd<T>;
  /** Where it landed. */
  readonly to: WrSortableMoveEnd<T>;
}

/**
 * Decides whether a list takes an item from another list of its group.
 * `from` is the list the gesture started in.
 */
type WrSortableCanEnter<T> = (item: T, from: WrSortableList<T>) => boolean;

export type { WrSortableCanEnter, WrSortableMoveEnd, WrSortableMoveEvent, WrSortableReorderEvent };
export type { WrSortableListContext } from './sortable-list-context';
