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
          description: 'Intent union — primary, success, warning, danger, info.',
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
        {
          name: 'WrTableRowClass',
          description: 'Per-row class predicate.',
          url: ['/reference/components', 'table'],
        },
        { name: 'WrTreeNode', description: 'Immutable tree node.', url: ['/reference/components', 'tree'] },
        { name: 'WrMarqueeItem', description: 'Image or template marquee entry.', url: ['/bits', 'marquee'] },
        { name: 'WrTimelineColor', description: 'Dot color union.', url: ['/reference/components', 'timeline'] },
      ],
    },
    {
      title: 'Charts',
      items: [
        { name: 'WrBarChartDatum', description: 'One bar of data.', url: ['/charts', 'bar-chart'] },
        { name: 'WrBarSeries', description: 'One series of bars, grouped or stacked.', url: ['/charts', 'bar-chart'] },
        { name: 'WrBarOrientation', description: 'Bars standing up or lying down.', url: ['/charts', 'bar-chart'] },
        { name: 'WrBarLine', description: 'A line drawn over the bars.', url: ['/charts', 'bar-chart'] },
        { name: 'WrLineSeries', description: 'One plotted line.', url: ['/charts', 'line-chart'] },
        { name: 'WrDonutSegment', description: 'One slice of the ring.', url: ['/charts', 'donut-chart'] },
        { name: 'WrHeatmapDatum', description: 'One contribution cell.', url: ['/charts', 'calendar-heatmap'] },
        { name: 'WrMeterSegment', description: 'One meter-group segment.', url: ['/charts', 'meter-group'] },
        { name: 'WrScatterSeries', description: 'One series of points.', url: ['/charts', 'scatter-chart'] },
        { name: 'WrScatterPoint', description: 'One point, with an optional size.', url: ['/charts', 'scatter-chart'] },
        {
          name: 'WrScatterAxis',
          description: 'Which axis a number is formatted for.',
          url: ['/charts', 'scatter-chart'],
        },
        { name: 'WrRadarSeries', description: 'One polygon across the axes.', url: ['/charts', 'radar-chart'] },
        { name: 'WrRadarVariant', description: 'Polygons or polar-area wedges.', url: ['/charts', 'radar-chart'] },
        {
          name: 'WrHeatmapMatrix',
          description: 'Rows × columns of values; null is an empty cell.',
          url: ['/charts', 'heatmap-chart'],
        },
        { name: 'WrFunnelStage', description: 'One stage of a funnel.', url: ['/charts', 'funnel-chart'] },
        {
          name: 'WrFunnelConversion',
          description: 'Which conversions the drawing prints.',
          url: ['/charts', 'funnel-chart'],
        },
        {
          name: 'WrWaterfallStep',
          description: 'One change, or a running total.',
          url: ['/charts', 'waterfall-chart'],
        },
        {
          name: 'WrWaterfallValueContext',
          description: 'Where a formatted figure is printed.',
          url: ['/charts', 'waterfall-chart'],
        },
        {
          name: 'WrTreemapNode',
          description: 'A leaf, or a group drawn round its children.',
          url: ['/charts', 'treemap-chart'],
        },
        {
          name: 'WrBoxplotGroup',
          description: 'One box: raw values or a summary.',
          url: ['/charts', 'boxplot-chart'],
        },
        { name: 'WrBoxplotStats', description: 'A five-number summary.', url: ['/charts', 'boxplot-chart'] },
        {
          name: 'WrCandlestickDatum',
          description: "One period's open, high, low and close.",
          url: ['/charts', 'candlestick-chart'],
        },
        { name: 'WrChartLegendItem', description: 'One legend row.', url: ['/charts', 'chart-legend'] },
        { name: 'WrChartLegendToggle', description: 'What a toggled row emits.', url: ['/charts', 'chart-legend'] },
        { name: 'WrChartMarker', description: 'A point marker shape.', url: ['/charts', 'chart-legend'] },
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
        { name: 'WrThemeConfig', description: 'Default mode + storage key.', url: ['/reference/services', 'theme'] },
        { name: 'WrScrollOptions', description: 'Scroll target + behavior.', url: ['/reference/services', 'scroll'] },
        { name: 'WrHotkeySpec', description: 'Key combo descriptor.', url: ['/reference/services', 'hotkey'] },
        { name: 'WrMetaConfig', description: 'Title template + tag defaults.', url: ['/reference/services', 'meta'] },
        { name: 'WrStorageConfig', description: 'Prefix + engine selection.', url: ['/reference/services', 'storage'] },
        { name: 'WrCookieOptions', description: 'Expiry / path / SameSite.', url: ['/reference/services', 'cookie'] },
        { name: 'WrPluralForms', description: 'CLDR plural category map.', url: ['/reference/pipes', 'wr-plural'] },
      ],
    },
  ];
}
