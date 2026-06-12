/** One node in the cascader tree. */
interface WrCascaderOption<T = string> {
  /** Value contributed when this node is part of the selection path. */
  readonly value: T;
  /** Display label for this node. */
  readonly label: string;
  /** Disable interaction for this node. @default false */
  readonly disabled?: boolean;
  /** Children. Absence (or empty array) marks this as a leaf. */
  readonly children?: readonly WrCascaderOption<T>[];
}

export type { WrCascaderOption };
