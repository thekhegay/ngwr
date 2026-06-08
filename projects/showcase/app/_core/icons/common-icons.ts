/**
 * Default icon set bound at the application root.
 *
 * These names are referenced from many showcase pages — declaring them
 * once at the root saves every page from re-registering the same
 * basics. Page-level `provideWrIcons(...)` calls add on top of these
 * (the lib's `<wr-icon>` merges root + element-level multi-provider
 * contributions, so root names stay visible even when a page declares
 * its own providers).
 */

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Funnel,
  Search,
  X,
} from 'lucide';
import type { WrIconDef } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

export const COMMON_ICONS: readonly WrIconDef[] = lucideIcons({
  'arrow-back': ArrowLeft,
  'arrow-down': ArrowDown,
  'arrow-forward': ArrowRight,
  'arrow-up': ArrowUp,
  'caret-back': ChevronLeft,
  'caret-down': ChevronDown,
  'caret-forward': ChevronRight,
  'caret-up': ChevronUp,
  checkmark: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  close: X,
  copy: Copy,
  eye: Eye,
  'eye-off': EyeOff,
  filter: Funnel,
  search: Search,
  time: Clock,
});
