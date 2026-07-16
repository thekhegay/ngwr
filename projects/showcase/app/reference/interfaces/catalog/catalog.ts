import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DocPageComponent, DocSectionComponent } from '#core/components';

interface TypeEntry {
  readonly name: string;
  readonly description: string;
  readonly url: readonly string[];
}

interface TypeGroup {
  readonly title: string;
  readonly items: readonly TypeEntry[];
}

@Component({
  selector: 'ngwr-interfaces-catalog-page',
  templateUrl: './catalog.html',
  imports: [RouterLink, DocPageComponent, DocSectionComponent],
})
export default class TypesCatalogPage {
  protected readonly groups: readonly TypeGroup[] = [
    {
      title: 'Core',
      items: [
        {
          name: 'Maybe<T>',
          description: 'Optional value — T | null | undefined.',
          url: ['/reference/interfaces', 'common'],
        },
        { name: 'SafeAny', description: 'Greppable, deliberate any.', url: ['/reference/interfaces', 'common'] },
        {
          name: 'WrColor',
          description: 'Palette union behind every [color] input.',
          url: ['/reference/interfaces', 'theme'],
        },
        { name: 'WrThemeMode', description: 'light / dark / auto.', url: ['/reference/interfaces', 'theme'] },
        { name: 'WrIconName', description: 'Registered icon name.', url: ['/icons', 'overview'] },
      ],
    },
    {
      title: 'Forms',
      items: [
        {
          name: 'WrSegmentedOption',
          description: 'One entry in a segmented track.',
          url: ['/reference/components', 'segmented'],
        },
        {
          name: 'WrSelectMode',
          description: 'single / multi / search / tag.',
          url: ['/reference/components', 'select'],
        },
        {
          name: 'WrCascaderOption',
          description: 'Node in a cascader tree.',
          url: ['/reference/components', 'cascader'],
        },
        {
          name: 'WrCalendarRange',
          description: '[start, end] tuple for range mode.',
          url: ['/reference/components', 'calendar'],
        },
        {
          name: 'WrFileUploadRejection',
          description: 'Rejected file + reason.',
          url: ['/reference/components', 'file-upload'],
        },
        { name: 'WrMentionItem', description: 'Mentionable entry.', url: ['/reference/components', 'mention'] },
      ],
    },
    {
      title: 'Data display',
      items: [
        {
          name: 'WrTableColumns',
          description: 'Column map keyed by row property.',
          url: ['/reference/components', 'table'],
        },
        { name: 'WrTableColumn', description: 'Single column definition.', url: ['/reference/components', 'table'] },
        { name: 'WrTableSortState', description: 'Emitted by (sortChange).', url: ['/reference/components', 'table'] },
        { name: 'WrTreeNode', description: 'Immutable tree node.', url: ['/reference/components', 'tree'] },
        { name: 'WrMarqueeItem', description: 'Image or template marquee entry.', url: ['/animations', 'marquee'] },
        { name: 'WrTimelineColor', description: 'Dot color union.', url: ['/reference/components', 'timeline'] },
      ],
    },
    {
      title: 'Charts',
      items: [
        { name: 'WrBarChartDatum', description: 'One bar of data.', url: ['/reference/components', 'bar-chart'] },
        { name: 'WrLineSeries', description: 'One plotted line.', url: ['/reference/components', 'line-chart'] },
        {
          name: 'WrDonutSegment',
          description: 'One slice of the ring.',
          url: ['/reference/components', 'donut-chart'],
        },
        {
          name: 'WrHeatmapDatum',
          description: 'One contribution cell.',
          url: ['/reference/components', 'calendar-heatmap'],
        },
        {
          name: 'WrMeterSegment',
          description: 'One meter-group segment.',
          url: ['/reference/components', 'meter-group'],
        },
      ],
    },
    {
      title: 'Navigation',
      items: [
        { name: 'WrSidebarItem', description: 'Navigable sidebar entry.', url: ['/reference/components', 'sidebar'] },
        {
          name: 'WrSidebarGroup',
          description: 'Expandable group of items.',
          url: ['/reference/components', 'sidebar'],
        },
        { name: 'WrAnchorLink', description: 'Entry in the anchor rail.', url: ['/reference/components', 'anchor'] },
        {
          name: 'WrCommandItem',
          description: 'Command palette action.',
          url: ['/reference/components', 'command-palette'],
        },
        {
          name: 'WrSpeedDialAction',
          description: 'Expanded dial button.',
          url: ['/reference/components', 'speed-dial'],
        },
      ],
    },
    {
      title: 'Overlays & feedback',
      items: [
        { name: 'WrToastOptions', description: 'Per-toast configuration.', url: ['/reference/components', 'toast'] },
        {
          name: 'WrDialogOptions',
          description: 'Programmatic dialog config.',
          url: ['/reference/components', 'dialog'],
        },
        { name: 'WrWindowConfig', description: 'Floating window config.', url: ['/reference/components', 'window'] },
        { name: 'WrPopoverPosition', description: 'Anchor side union.', url: ['/reference/components', 'popover'] },
        { name: 'WrResultStatus', description: 'Result preset union.', url: ['/reference/components', 'result'] },
      ],
    },
    {
      title: 'Services & config',
      items: [
        { name: 'WrThemeConfig', description: 'provideWrTheme options.', url: ['/reference/services', 'theme'] },
        { name: 'WrScrollOptions', description: 'Scroll target + behavior.', url: ['/reference/services', 'scroll'] },
        { name: 'WrHotkeySpec', description: 'Key combo descriptor.', url: ['/reference/services', 'hotkey'] },
        { name: 'WrMetaConfig', description: 'Title template + tag defaults.', url: ['/reference/services', 'meta'] },
        { name: 'WrStorageConfig', description: 'Prefix + engine selection.', url: ['/reference/services', 'storage'] },
        { name: 'WrCookieOptions', description: 'Expiry / path / SameSite.', url: ['/reference/services', 'cookie'] },
        { name: 'WrBreakpoint', description: 'Named responsive breakpoint.', url: ['/reference/services', 'media'] },
        { name: 'WrPluralForms', description: 'CLDR plural category map.', url: ['/reference/pipes', 'wr-plural'] },
      ],
    },
  ];
}
