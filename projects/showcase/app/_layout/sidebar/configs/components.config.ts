import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * The component half of the Reference sidebar — every UI component grouped by
 * purpose. These are the only rows that contribute SEVERAL top-level groups;
 * the other six clusters contribute one each (see `reference.config.ts`).
 *
 * Grouping rules of thumb: anything rendered in a CDK overlay lives in
 * Overlays; passive status surfaces live in Feedback; containers and
 * shells live in Layout.
 */
export const COMPONENT_GROUPS: readonly SidebarGroup[] = [
  {
    title: 'Buttons',
    children: [
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.button),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.buttonGroup),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.speedDial),
    ],
  },
  {
    title: 'Data',
    children: [
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.sortableList),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.eventCalendar),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.graph),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.pagination),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.table),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.tree),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.virtualScroll),
    ],
  },
  {
    title: 'Display',
    children: [
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.avatar),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.badge),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.compare),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.counter),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.descriptions),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.divider),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.icon),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.imageCropper),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.keyboard),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.lightbox),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.markdown),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.qrCode),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.statistic),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.timeline),
    ],
  },
  {
    title: 'Feedback',
    children: [
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.alert),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.empty),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.progress),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.pullToRefresh),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.result),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.skeleton),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.spinner),
    ],
  },
  {
    title: 'Form',
    children: [
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.calendar),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.cascader),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.checkbox),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.colorPicker),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.datePicker),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.editor),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.fileUpload),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.form),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.formField),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.input),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.inputNumber),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.inputOtp),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.knob),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.mention),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.radio),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.rating),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.schemaForm),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.segmented),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.select),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.slider),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.switch),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.textarea),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.transfer),
    ],
  },
  {
    title: 'Layout',
    children: [
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.card),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.carousel),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.collapse),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.layout),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.list),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.pageHeader),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.splitter),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.toolbar),
    ],
  },
  {
    title: 'Navigation',
    children: [
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.anchor),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.backTop),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.breadcrumbs),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.burger),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.dropdown),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.sidebar),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.stepper),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.tabs),
    ],
  },
  {
    title: 'Overlays',
    children: [
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.commandPalette),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.contextMenu),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.dialog),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.drawer),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.popconfirm),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.popover),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.toast),
      wrLink(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.window),
    ],
  },
];
