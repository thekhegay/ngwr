import type { WrIconName } from 'ngwr/icon';

/** Per-button action shown when the dial expands. */
interface WrSpeedDialAction {
  readonly id: string;
  readonly label: string;
  readonly icon?: WrIconName;
}

/** Direction the action buttons fan out. */
type WrSpeedDialDirection = 'up' | 'down' | 'left' | 'right';

export type { WrSpeedDialAction, WrSpeedDialDirection };
