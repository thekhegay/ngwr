import { ROUTES, wrPath, type WrRoute } from '#routes';
import type { SidebarGroup, SidebarLink } from '#types';

const base = [ROUTES.reference, ROUTES.reference.components];

/** A row takes its title and its link from the route node, so the two cannot disagree. */
const link = (route: WrRoute): SidebarLink => ({ title: route.title, url: wrPath(...base, route) });

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
      link(ROUTES.reference.components.button),
      link(ROUTES.reference.components.buttonGroup),
      link(ROUTES.reference.components.speedDial),
    ],
  },
  {
    title: 'Data',
    children: [
      link(ROUTES.reference.components.sortableList),
      link(ROUTES.reference.components.eventCalendar),
      link(ROUTES.reference.components.graph),
      link(ROUTES.reference.components.pagination),
      link(ROUTES.reference.components.table),
      link(ROUTES.reference.components.tree),
      link(ROUTES.reference.components.virtualScroll),
    ],
  },
  {
    title: 'Display',
    children: [
      link(ROUTES.reference.components.avatar),
      link(ROUTES.reference.components.badge),
      link(ROUTES.reference.components.compare),
      link(ROUTES.reference.components.counter),
      link(ROUTES.reference.components.descriptions),
      link(ROUTES.reference.components.divider),
      link(ROUTES.reference.components.icon),
      link(ROUTES.reference.components.imageCropper),
      link(ROUTES.reference.components.keyboard),
      link(ROUTES.reference.components.lightbox),
      link(ROUTES.reference.components.markdown),
      link(ROUTES.reference.components.qrCode),
      link(ROUTES.reference.components.statistic),
      link(ROUTES.reference.components.timeline),
    ],
  },
  {
    title: 'Feedback',
    children: [
      link(ROUTES.reference.components.alert),
      link(ROUTES.reference.components.empty),
      link(ROUTES.reference.components.progress),
      link(ROUTES.reference.components.pullToRefresh),
      link(ROUTES.reference.components.result),
      link(ROUTES.reference.components.skeleton),
      link(ROUTES.reference.components.spinner),
    ],
  },
  {
    title: 'Form',
    children: [
      link(ROUTES.reference.components.calendar),
      link(ROUTES.reference.components.cascader),
      link(ROUTES.reference.components.checkbox),
      link(ROUTES.reference.components.colorPicker),
      link(ROUTES.reference.components.datePicker),
      link(ROUTES.reference.components.editor),
      link(ROUTES.reference.components.fileUpload),
      link(ROUTES.reference.components.form),
      link(ROUTES.reference.components.formField),
      link(ROUTES.reference.components.input),
      link(ROUTES.reference.components.inputNumber),
      link(ROUTES.reference.components.inputOtp),
      link(ROUTES.reference.components.knob),
      link(ROUTES.reference.components.mention),
      link(ROUTES.reference.components.radio),
      link(ROUTES.reference.components.rating),
      link(ROUTES.reference.components.schemaForm),
      link(ROUTES.reference.components.segmented),
      link(ROUTES.reference.components.select),
      link(ROUTES.reference.components.slider),
      link(ROUTES.reference.components.switch),
      link(ROUTES.reference.components.textarea),
      link(ROUTES.reference.components.transfer),
    ],
  },
  {
    title: 'Layout',
    children: [
      link(ROUTES.reference.components.card),
      link(ROUTES.reference.components.carousel),
      link(ROUTES.reference.components.collapse),
      link(ROUTES.reference.components.layout),
      link(ROUTES.reference.components.list),
      link(ROUTES.reference.components.pageHeader),
      link(ROUTES.reference.components.splitter),
      link(ROUTES.reference.components.toolbar),
    ],
  },
  {
    title: 'Navigation',
    children: [
      link(ROUTES.reference.components.anchor),
      link(ROUTES.reference.components.backTop),
      link(ROUTES.reference.components.breadcrumbs),
      link(ROUTES.reference.components.burger),
      link(ROUTES.reference.components.dropdown),
      link(ROUTES.reference.components.sidebar),
      link(ROUTES.reference.components.stepper),
      link(ROUTES.reference.components.tabs),
    ],
  },
  {
    title: 'Overlays',
    children: [
      link(ROUTES.reference.components.commandPalette),
      link(ROUTES.reference.components.contextMenu),
      link(ROUTES.reference.components.dialog),
      link(ROUTES.reference.components.drawer),
      link(ROUTES.reference.components.popconfirm),
      link(ROUTES.reference.components.popover),
      link(ROUTES.reference.components.toast),
      link(ROUTES.reference.components.window),
    ],
  },
];
