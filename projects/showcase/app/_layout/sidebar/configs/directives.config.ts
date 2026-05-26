import type { SidebarGroup } from '../sidebar.types';

/** Flat sidebar for `/directives/*` — one direct-link row per directive. */
export const DIRECTIVES_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'wrAutofocus', url: ['/directives', 'autofocus'] },
  { title: 'wrAutosize', url: ['/directives', 'autosize'] },
  { title: 'wrClickOutside', url: ['/directives', 'click-outside'] },
  { title: 'wrCopyToClipboard', url: ['/directives', 'copy-to-clipboard'] },
];
