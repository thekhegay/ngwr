import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/components/*` — every UI component grouped by purpose.
 * Attached via `data: { sidebar: COMPONENTS_SIDEBAR }` on the
 * `/components` route (see `routing.ts`).
 *
 * Grouping rules of thumb: anything rendered in a CDK overlay lives in
 * Overlays; passive status surfaces live in Feedback; containers and
 * shells live in Layout.
 */
export const COMPONENTS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Form',
    children: [
      { title: 'Calendar', url: ['/components', 'calendar'] },
      { title: 'Cascader', url: ['/components', 'cascader'] },
      { title: 'Checkbox', url: ['/components', 'checkbox'] },
      { title: 'Color Picker', url: ['/components', 'color-picker'] },
      { title: 'Date Picker', url: ['/components', 'date-picker'] },
      { title: 'File Upload', url: ['/components', 'file-upload'] },
      { title: 'Form', url: ['/components', 'form'] },
      { title: 'Form Field', url: ['/components', 'form-field'] },
      { title: 'Input', url: ['/components', 'input'] },
      { title: 'Input Number', url: ['/components', 'input-number'] },
      { title: 'Input OTP', url: ['/components', 'input-otp'] },
      { title: 'Knob', url: ['/components', 'knob'] },
      { title: 'Mention', url: ['/components', 'mention'] },
      { title: 'Radio', url: ['/components', 'radio'] },
      { title: 'Rating', url: ['/components', 'rating'] },
      { title: 'Segmented', url: ['/components', 'segmented'] },
      { title: 'Select', url: ['/components', 'select'] },
      { title: 'Slider', url: ['/components', 'slider'] },
      { title: 'Switch', url: ['/components', 'switch'] },
      { title: 'Textarea', url: ['/components', 'textarea'] },
    ],
  },
  {
    title: 'Buttons',
    children: [
      { title: 'Button', url: ['/components', 'button'] },
      { title: 'Button Group', url: ['/components', 'button-group'] },
      { title: 'Speed Dial', url: ['/components', 'speed-dial'] },
    ],
  },
  {
    title: 'Data',
    children: [
      { title: 'Drag & Drop', url: ['/components', 'drag-drop'] },
      { title: 'Pagination', url: ['/components', 'pagination'] },
      { title: 'Table', url: ['/components', 'table'] },
      { title: 'Tree', url: ['/components', 'tree'] },
      { title: 'Virtual Scroll', url: ['/components', 'virtual-scroll'] },
    ],
  },
  {
    title: 'Feedback',
    children: [
      { title: 'Alert', url: ['/components', 'alert'] },
      { title: 'Empty', url: ['/components', 'empty'] },
      { title: 'Progress', url: ['/components', 'progress'] },
      { title: 'Result', url: ['/components', 'result'] },
      { title: 'Skeleton', url: ['/components', 'skeleton'] },
      { title: 'Spinner', url: ['/components', 'spinner'] },
    ],
  },
  {
    title: 'Display',
    children: [
      { title: 'Avatar', url: ['/components', 'avatar'] },
      { title: 'Badge', url: ['/components', 'badge'] },
      { title: 'Compare', url: ['/components', 'compare'] },
      { title: 'Counter', url: ['/components', 'counter'] },
      { title: 'Descriptions', url: ['/components', 'descriptions'] },
      { title: 'Divider', url: ['/components', 'divider'] },
      { title: 'Image Cropper', url: ['/components', 'image-cropper'] },
      { title: 'Keyboard', url: ['/components', 'keyboard'] },
      { title: 'Lightbox', url: ['/components', 'lightbox'] },
      { title: 'QR', url: ['/components', 'qrcode'] },
      { title: 'Statistic', url: ['/components', 'statistic'] },
      { title: 'Timeline', url: ['/components', 'timeline'] },
      { title: 'Typography', url: ['/components', 'typography'] },
    ],
  },
  {
    title: 'Layout',
    children: [
      { title: 'Card', url: ['/components', 'card'] },
      { title: 'Carousel', url: ['/components', 'carousel'] },
      { title: 'Collapse', url: ['/components', 'collapse'] },
      { title: 'Layout', url: ['/components', 'layout'] },
      { title: 'List', url: ['/components', 'list'] },
      { title: 'Page Header', url: ['/components', 'page-header'] },
      { title: 'Splitter', url: ['/components', 'splitter'] },
      { title: 'Toolbar', url: ['/components', 'toolbar'] },
    ],
  },
  {
    title: 'Navigation',
    children: [
      { title: 'Anchor', url: ['/components', 'anchor'] },
      { title: 'Back to Top', url: ['/components', 'back-top'] },
      { title: 'Breadcrumbs', url: ['/components', 'breadcrumbs'] },
      { title: 'Dropdown', url: ['/components', 'dropdown'] },
      { title: 'Sidebar', url: ['/components', 'sidebar'] },
      { title: 'Stepper', url: ['/components', 'stepper'] },
      { title: 'Tabs', url: ['/components', 'tabs'] },
    ],
  },
  {
    title: 'Overlays',
    children: [
      { title: 'Command Palette', url: ['/components', 'command-palette'] },
      { title: 'Context Menu', url: ['/components', 'context-menu'] },
      { title: 'Dialog', url: ['/components', 'dialog'] },
      { title: 'Drawer', url: ['/components', 'drawer'] },
      { title: 'Popconfirm', url: ['/components', 'popconfirm'] },
      { title: 'Popover', url: ['/components', 'popover'] },
      { title: 'Toast', url: ['/components', 'toast'] },
      { title: 'Window', url: ['/components', 'window'] },
    ],
  },
  {
    title: 'Charts',
    children: [
      { title: 'Bar Chart', url: ['/components', 'bar-chart'] },
      { title: 'Calendar Heatmap', url: ['/components', 'calendar-heatmap'] },
      { title: 'Donut Chart', url: ['/components', 'donut-chart'] },
      { title: 'Gauge', url: ['/components', 'gauge'] },
      { title: 'Line Chart', url: ['/components', 'line-chart'] },
      { title: 'Meter Group', url: ['/components', 'meter-group'] },
      { title: 'Sparkline', url: ['/components', 'sparkline'] },
    ],
  },
  { title: 'Squircle', url: ['/components', 'squircle'] },
];
