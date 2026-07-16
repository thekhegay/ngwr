import type { SidebarGroup } from '../sidebar.types';

/** Flat sidebar for `/reference/directives/*` — one direct-link row per directive. */
export const DIRECTIVES_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'wrAffix', url: ['/reference/directives', 'affix'] },
  { title: 'wrAutofocus', url: ['/reference/directives', 'autofocus'] },
  { title: 'wrAutosize', url: ['/reference/directives', 'autosize'] },
  { title: 'wrClickOutside', url: ['/reference/directives', 'click-outside'] },
  { title: 'wrCopyToClipboard', url: ['/reference/directives', 'copy-to-clipboard'] },
  { title: 'wrTypography', url: ['/reference/directives', 'typography'] },
];
