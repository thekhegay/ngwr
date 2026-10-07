import { ROUTES } from '#routes';
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
      ROUTES.reference.components.button,
      ROUTES.reference.components.buttonGroup,
      ROUTES.reference.components.speedDial,
    ],
  },
  {
    title: 'Data',
    children: [
      ROUTES.reference.components.sortableList,
      ROUTES.reference.components.eventCalendar,
      ROUTES.reference.components.graph,
      ROUTES.reference.components.pagination,
      ROUTES.reference.components.table,
      ROUTES.reference.components.tree,
      ROUTES.reference.components.virtualScroll,
    ],
  },
  {
    title: 'Display',
    children: [
      ROUTES.reference.components.avatar,
      ROUTES.reference.components.badge,
      ROUTES.reference.components.compare,
      ROUTES.reference.components.counter,
      ROUTES.reference.components.descriptions,
      ROUTES.reference.components.divider,
      ROUTES.reference.components.icon,
      ROUTES.reference.components.imageCropper,
      ROUTES.reference.components.keyboard,
      ROUTES.reference.components.lightbox,
      ROUTES.reference.components.markdown,
      ROUTES.reference.components.qrCode,
      ROUTES.reference.components.statistic,
      ROUTES.reference.components.timeline,
    ],
  },
  {
    title: 'Feedback',
    children: [
      ROUTES.reference.components.alert,
      ROUTES.reference.components.empty,
      ROUTES.reference.components.progress,
      ROUTES.reference.components.pullToRefresh,
      ROUTES.reference.components.result,
      ROUTES.reference.components.skeleton,
      ROUTES.reference.components.spinner,
    ],
  },
  {
    title: 'Form',
    children: [
      ROUTES.reference.components.calendar,
      ROUTES.reference.components.cascader,
      ROUTES.reference.components.checkbox,
      ROUTES.reference.components.colorPicker,
      ROUTES.reference.components.datePicker,
      ROUTES.reference.components.editor,
      ROUTES.reference.components.fileUpload,
      ROUTES.reference.components.form,
      ROUTES.reference.components.formField,
      ROUTES.reference.components.input,
      ROUTES.reference.components.inputNumber,
      ROUTES.reference.components.inputOtp,
      ROUTES.reference.components.knob,
      ROUTES.reference.components.mention,
      ROUTES.reference.components.radio,
      ROUTES.reference.components.rating,
      ROUTES.reference.components.schemaForm,
      ROUTES.reference.components.segmented,
      ROUTES.reference.components.select,
      ROUTES.reference.components.slider,
      ROUTES.reference.components.switch,
      ROUTES.reference.components.textarea,
      ROUTES.reference.components.transfer,
    ],
  },
  {
    title: 'Layout',
    children: [
      ROUTES.reference.components.card,
      ROUTES.reference.components.carousel,
      ROUTES.reference.components.collapse,
      ROUTES.reference.components.layout,
      ROUTES.reference.components.list,
      ROUTES.reference.components.pageHeader,
      ROUTES.reference.components.splitter,
      ROUTES.reference.components.toolbar,
    ],
  },
  {
    title: 'Navigation',
    children: [
      ROUTES.reference.components.anchor,
      ROUTES.reference.components.backTop,
      ROUTES.reference.components.breadcrumbs,
      ROUTES.reference.components.burger,
      ROUTES.reference.components.dropdown,
      ROUTES.reference.components.sidebar,
      ROUTES.reference.components.stepper,
      ROUTES.reference.components.tabs,
    ],
  },
  {
    title: 'Overlays',
    children: [
      ROUTES.reference.components.commandPalette,
      ROUTES.reference.components.contextMenu,
      ROUTES.reference.components.dialog,
      ROUTES.reference.components.drawer,
      ROUTES.reference.components.popconfirm,
      ROUTES.reference.components.popover,
      ROUTES.reference.components.toast,
      ROUTES.reference.components.window,
    ],
  },
];
