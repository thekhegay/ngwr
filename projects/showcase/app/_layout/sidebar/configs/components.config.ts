import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/reference/components/*` — every UI component grouped by purpose.
 * Attached via `data: { sidebar: COMPONENTS_SIDEBAR }` on the
 * `/components` route (see `routing.ts`).
 *
 * Grouping rules of thumb: anything rendered in a CDK overlay lives in
 * Overlays; passive status surfaces live in Feedback; containers and
 * shells live in Layout.
 */
export const COMPONENTS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Buttons',
    children: [
      { title: 'Button', url: ['/reference/components', 'button'] },
      { title: 'Button Group', url: ['/reference/components', 'button-group'] },
      { title: 'Speed Dial', url: ['/reference/components', 'speed-dial'] },
    ],
  },
  {
    title: 'Charts',
    children: [
      { title: 'Bar Chart', url: ['/reference/components', 'bar-chart'] },
      { title: 'Calendar Heatmap', url: ['/reference/components', 'calendar-heatmap'] },
      { title: 'Donut Chart', url: ['/reference/components', 'donut-chart'] },
      { title: 'Gauge', url: ['/reference/components', 'gauge'] },
      { title: 'Line Chart', url: ['/reference/components', 'line-chart'] },
      { title: 'Meter Group', url: ['/reference/components', 'meter-group'] },
      { title: 'Sparkline', url: ['/reference/components', 'sparkline'] },
    ],
  },
  {
    title: 'Data',
    children: [
      { title: 'Drag & Drop', url: ['/reference/components', 'drag-drop'] },
      { title: 'Pagination', url: ['/reference/components', 'pagination'] },
      { title: 'Table', url: ['/reference/components', 'table'] },
      { title: 'Tree', url: ['/reference/components', 'tree'] },
      { title: 'Virtual Scroll', url: ['/reference/components', 'virtual-scroll'] },
    ],
  },
  {
    title: 'Display',
    children: [
      { title: 'Avatar', url: ['/reference/components', 'avatar'] },
      { title: 'Badge', url: ['/reference/components', 'badge'] },
      { title: 'Compare', url: ['/reference/components', 'compare'] },
      { title: 'Counter', url: ['/reference/components', 'counter'] },
      { title: 'Descriptions', url: ['/reference/components', 'descriptions'] },
      { title: 'Divider', url: ['/reference/components', 'divider'] },
      { title: 'Image Cropper', url: ['/reference/components', 'image-cropper'] },
      { title: 'Keyboard', url: ['/reference/components', 'keyboard'] },
      { title: 'Lightbox', url: ['/reference/components', 'lightbox'] },
      { title: 'QR', url: ['/reference/components', 'qrcode'] },
      { title: 'Statistic', url: ['/reference/components', 'statistic'] },
      { title: 'Timeline', url: ['/reference/components', 'timeline'] },
    ],
  },
  {
    title: 'Feedback',
    children: [
      { title: 'Alert', url: ['/reference/components', 'alert'] },
      { title: 'Empty', url: ['/reference/components', 'empty'] },
      { title: 'Progress', url: ['/reference/components', 'progress'] },
      { title: 'Pull to Refresh', url: ['/reference/components', 'pull-to-refresh'] },
      { title: 'Result', url: ['/reference/components', 'result'] },
      { title: 'Skeleton', url: ['/reference/components', 'skeleton'] },
      { title: 'Spinner', url: ['/reference/components', 'spinner'] },
    ],
  },
  {
    title: 'Form',
    children: [
      { title: 'Calendar', url: ['/reference/components', 'calendar'] },
      { title: 'Cascader', url: ['/reference/components', 'cascader'] },
      { title: 'Checkbox', url: ['/reference/components', 'checkbox'] },
      { title: 'Color Picker', url: ['/reference/components', 'color-picker'] },
      { title: 'Date Picker', url: ['/reference/components', 'date-picker'] },
      { title: 'File Upload', url: ['/reference/components', 'file-upload'] },
      { title: 'Form', url: ['/reference/components', 'form'] },
      { title: 'Form Field', url: ['/reference/components', 'form-field'] },
      { title: 'Input', url: ['/reference/components', 'input'] },
      { title: 'Input Number', url: ['/reference/components', 'input-number'] },
      { title: 'Input OTP', url: ['/reference/components', 'input-otp'] },
      { title: 'Knob', url: ['/reference/components', 'knob'] },
      { title: 'Mention', url: ['/reference/components', 'mention'] },
      { title: 'Radio', url: ['/reference/components', 'radio'] },
      { title: 'Rating', url: ['/reference/components', 'rating'] },
      { title: 'Segmented', url: ['/reference/components', 'segmented'] },
      { title: 'Select', url: ['/reference/components', 'select'] },
      { title: 'Slider', url: ['/reference/components', 'slider'] },
      { title: 'Switch', url: ['/reference/components', 'switch'] },
      { title: 'Textarea', url: ['/reference/components', 'textarea'] },
    ],
  },
  {
    title: 'Layout',
    children: [
      { title: 'Card', url: ['/reference/components', 'card'] },
      { title: 'Carousel', url: ['/reference/components', 'carousel'] },
      { title: 'Collapse', url: ['/reference/components', 'collapse'] },
      { title: 'Layout', url: ['/reference/components', 'layout'] },
      { title: 'List', url: ['/reference/components', 'list'] },
      { title: 'Page Header', url: ['/reference/components', 'page-header'] },
      { title: 'Splitter', url: ['/reference/components', 'splitter'] },
      { title: 'Toolbar', url: ['/reference/components', 'toolbar'] },
    ],
  },
  {
    title: 'Navigation',
    children: [
      { title: 'Anchor', url: ['/reference/components', 'anchor'] },
      { title: 'Back to Top', url: ['/reference/components', 'back-top'] },
      { title: 'Breadcrumbs', url: ['/reference/components', 'breadcrumbs'] },
      { title: 'Burger', url: ['/reference/components', 'burger'] },
      { title: 'Dropdown', url: ['/reference/components', 'dropdown'] },
      { title: 'Sidebar', url: ['/reference/components', 'sidebar'] },
      { title: 'Stepper', url: ['/reference/components', 'stepper'] },
      { title: 'Tabs', url: ['/reference/components', 'tabs'] },
    ],
  },
  {
    title: 'Overlays',
    children: [
      { title: 'Action Sheet', url: ['/reference/components', 'action-sheet'] },
      { title: 'Command Palette', url: ['/reference/components', 'command-palette'] },
      { title: 'Context Menu', url: ['/reference/components', 'context-menu'] },
      { title: 'Dialog', url: ['/reference/components', 'dialog'] },
      { title: 'Drawer', url: ['/reference/components', 'drawer'] },
      { title: 'Popconfirm', url: ['/reference/components', 'popconfirm'] },
      { title: 'Popover', url: ['/reference/components', 'popover'] },
      { title: 'Toast', url: ['/reference/components', 'toast'] },
      { title: 'Window', url: ['/reference/components', 'window'] },
    ],
  },
  { title: 'Squircle', url: ['/reference/components', 'squircle'] },
];
