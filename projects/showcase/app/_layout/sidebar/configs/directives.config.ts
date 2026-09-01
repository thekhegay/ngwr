import type { SidebarGroup } from '../sidebar.types';

/** The Directives group of the Reference sidebar — one row per directive. */
export const DIRECTIVES_GROUP: SidebarGroup = {
  title: 'Directives',
  children: [
    { title: 'wrAffix', url: ['/reference/directives', 'affix'] },
    { title: 'wrAutofocus', url: ['/reference/directives', 'autofocus'] },
    { title: 'wrAutosize', url: ['/reference/directives', 'autosize'] },
    { title: 'wrClickOutside', url: ['/reference/directives', 'click-outside'] },
    { title: 'wrCopyToClipboard', url: ['/reference/directives', 'copy-to-clipboard'] },
    { title: 'wrTypography', url: ['/reference/directives', 'typography'] },
  ],
};
