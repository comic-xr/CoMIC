/**
 * FilterToolbar Stories
 *
 * Main filter UI component with responsive layouts.
 */

import React, { useState } from 'react';
import { FilterToolbar, LAYOUT_BREAKPOINTS } from './FilterToolbar';
import { useListFilter } from '@UI/react/hooks/useListFilter';
import { FILES_FILTER_CONFIG } from '@UI/react/hooks/useListFilter/filterConfigs';

const APP_SURFACE_STYLE = {
  minHeight: '100vh',
  background: 'var(--color-bg-base, #020406)',
  padding: 24,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
};

const PANEL_STYLE = {
  background: 'var(--color-bg-secondary, #12121a)',
  border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))',
  borderRadius: 8,
  padding: 16,
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
};

const SECTION_HEADING_STYLE = {
  color: 'var(--color-text-primary, #e5e7eb)',
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 600,
};

export default {
  title: 'Organisms/FilterToolbar',
  component: FilterToolbar,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={APP_SURFACE_STYLE}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    layout: {
      control: 'select',
      options: ['auto', 'full', 'compact', 'minimal', 'ultra'],
    },
    width: {
      control: { type: 'range', min: 200, max: 600 },
    },
    showQuickFilters: { control: 'boolean' },
    maxVisibleQuickFilters: { control: { type: 'number', min: 1, max: 6 } },
  },
};

// Sample data for demonstrations
const SAMPLE_TYPE_COUNTS = {
  nifti: 23,
  dicom: 156,
  minc: 0,
  analyze: 5,
  vtk: 12,
  obj: 8,
  stl: 3,
  gltf: 0,
  ply: 1,
  png: 45,
  jpg: 89,
  tiff: 12,
  webp: 0,
  pdf: 7,
  csv: 15,
  json: 22,
  xml: 4,
};

const SAMPLE_QUICK_FILTER_COUNTS = {
  loaded: 42,
  starred: 12,
  shared: 8,
  linked: 5,
};

const SAMPLE_TAGS = [
  { id: 'brain', name: 'Brain', color: '#3b82f6', count: 45 },
  { id: 'spine', name: 'Spine', color: '#22c55e', count: 12 },
  { id: 'heart', name: 'Heart', color: '#ef4444', count: 8 },
  { id: 'important', name: 'Important', color: '#f59e0b', count: 15 },
  { id: 'review', name: 'Needs Review', color: '#8b5cf6', count: 6 },
];

// Base template with useListFilter
const Template = (args) => {
  const filter = useListFilter(FILES_FILTER_CONFIG);

  return (
    <div
      style={{
        ...PANEL_STYLE,
        width: args.width || '100%',
        maxWidth: 600,
      }}
    >
      <FilterToolbar
        filter={filter}
        config={FILES_FILTER_CONFIG}
        counts={SAMPLE_TYPE_COUNTS}
        quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
        tags={SAMPLE_TAGS}
        {...args}
      />
    </div>
  );
};

// Default - Full Layout
export const Default = Template.bind({});
Default.args = {
  layout: 'auto',
  width: 450,
  showQuickFilters: true,
  maxVisibleQuickFilters: 4,
};

// Full Layout (≥400px)
export const FullLayout = Template.bind({});
FullLayout.args = {
  layout: 'full',
  width: 500,
};

// Compact Layout (300-399px)
export const CompactLayout = Template.bind({});
CompactLayout.args = {
  layout: 'compact',
  width: 350,
};

// Minimal Layout (<300px)
export const MinimalLayout = Template.bind({});
MinimalLayout.args = {
  layout: 'minimal',
  width: 280,
};

// Ultra Layout (<270px)
export const UltraLayout = Template.bind({});
UltraLayout.args = {
  layout: 'ultra',
  width: 240,
};

// Interactive - Resize to See Layouts
export const InteractiveResize = () => {
  const [width, setWidth] = useState(450);
  const filter = useListFilter(FILES_FILTER_CONFIG);

  const layoutMode =
    width >= LAYOUT_BREAKPOINTS.FULL
      ? 'full'
      : width >= LAYOUT_BREAKPOINTS.COMPACT
        ? 'compact'
        : width >= LAYOUT_BREAKPOINTS.ULTRA
          ? 'minimal'
          : 'ultra';

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <input
          type="range"
          min={200}
          max={600}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ color: 'var(--color-text-secondary, #cbd5f5)', fontFamily: 'monospace' }}>
          {width}px ({layoutMode})
        </span>
      </div>

      <div
        style={{
          ...PANEL_STYLE,
          width: width,
          transition: 'width 0.2s ease',
        }}
      >
        <FilterToolbar
          filter={filter}
          config={FILES_FILTER_CONFIG}
          counts={SAMPLE_TYPE_COUNTS}
          quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
          tags={SAMPLE_TAGS}
          width={width}
        />
      </div>
    </div>
  );
};

// With Active Filters
export const WithActiveFilters = () => {
  const filter = useListFilter({
    ...FILES_FILTER_CONFIG,
    initialState: {
      search: 'brain',
      types: ['nifti', 'dicom'],
      quickFilters: ['loaded', 'starred'],
    },
  });

  return (
    <div
      style={{
        width: 500,
        ...PANEL_STYLE,
      }}
    >
      <FilterToolbar
        filter={filter}
        config={FILES_FILTER_CONFIG}
        counts={SAMPLE_TYPE_COUNTS}
        quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
        tags={SAMPLE_TAGS}
      />
    </div>
  );
};

// Without Quick Filters
export const WithoutQuickFilters = Template.bind({});
WithoutQuickFilters.args = {
  layout: 'full',
  width: 500,
  showQuickFilters: false,
};

// Without Tags
export const WithoutTags = () => {
  const filter = useListFilter(FILES_FILTER_CONFIG);

  return (
    <div
      style={{
        width: 450,
        ...PANEL_STYLE,
      }}
    >
      <FilterToolbar
        filter={filter}
        config={FILES_FILTER_CONFIG}
        counts={SAMPLE_TYPE_COUNTS}
        quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
        tags={[]}
      />
    </div>
  );
};

// Embedded Variant - For contextual panels
export const EmbeddedVariant = () => {
  const filter = useListFilter(FILES_FILTER_CONFIG);

  return (
    <div
      style={{
        width: 300,
        ...PANEL_STYLE,
      }}
    >
      <h3 style={SECTION_HEADING_STYLE}>Embedded Variant (for contextual panels)</h3>
      <FilterToolbar
        filter={filter}
        config={FILES_FILTER_CONFIG}
        quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
        variant="embedded"
        quickFiltersToggleable
        showTypeFilter={false}
        showTagFilter={false}
        showSortFilter={false}
        searchPlaceholder="Search groups..."
      />
    </div>
  );
};

// Embedded with Sort
export const EmbeddedWithSort = () => {
  const filter = useListFilter(FILES_FILTER_CONFIG);

  return (
    <div
      style={{
        width: 300,
        ...PANEL_STYLE,
      }}
    >
      <h3 style={SECTION_HEADING_STYLE}>Embedded with Sort dropdown</h3>
      <FilterToolbar
        filter={filter}
        config={FILES_FILTER_CONFIG}
        quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
        variant="embedded"
        quickFiltersToggleable
        showTypeFilter={false}
        showTagFilter={false}
        showSortFilter
        searchPlaceholder="Search items..."
      />
    </div>
  );
};

// Embedded with Filters Dropdown - For complex filtering (file types, tags, etc.)
export const EmbeddedWithFiltersDropdown = () => {
  const filter = useListFilter(FILES_FILTER_CONFIG);

  return (
    <div
      style={{
        width: 320,
        ...PANEL_STYLE,
      }}
    >
      <h3 style={SECTION_HEADING_STYLE}>Embedded with Filters Dropdown</h3>
      <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 12 }}>
        Click the filter icon to open type/tag filters
      </p>
      <FilterToolbar
        filter={filter}
        config={FILES_FILTER_CONFIG}
        counts={SAMPLE_TYPE_COUNTS}
        quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
        tags={SAMPLE_TAGS}
        variant="embedded"
        quickFiltersToggleable
        showTypeFilter
        showTagFilter
        showSortFilter
        searchPlaceholder="Search files..."
      />
    </div>
  );
};

// Embedded Full Featured - All options enabled
export const EmbeddedFullFeatured = () => {
  const filter = useListFilter(FILES_FILTER_CONFIG);

  return (
    <div
      style={{
        width: 350,
        ...PANEL_STYLE,
      }}
    >
      <h3 style={SECTION_HEADING_STYLE}>Embedded Full Featured</h3>
      <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 12 }}>
        Search + Filters dropdown + Quick filters + Sort
      </p>
      <FilterToolbar
        filter={filter}
        config={FILES_FILTER_CONFIG}
        counts={SAMPLE_TYPE_COUNTS}
        quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
        tags={SAMPLE_TAGS}
        variant="embedded"
        quickFiltersToggleable
        showTypeFilter
        showTagFilter
        showSortFilter
        showQuickFilters
        searchPlaceholder="Search..."
      />
    </div>
  );
};

// Embedded Without Quick Filters
export const EmbeddedSearchOnly = () => {
  const filter = useListFilter({
    ...FILES_FILTER_CONFIG,
    quickFilterDefs: [], // No quick filters
  });

  return (
    <div
      style={{
        width: 300,
        ...PANEL_STYLE,
      }}
    >
      <h3 style={SECTION_HEADING_STYLE}>Embedded (search only)</h3>
      <FilterToolbar
        filter={filter}
        config={{ ...FILES_FILTER_CONFIG, quickFilterDefs: [] }}
        variant="embedded"
        showTypeFilter={false}
        showTagFilter={false}
        showSortFilter={false}
        searchPlaceholder="Search..."
      />
    </div>
  );
};

// All Layouts Side by Side
export const AllLayouts = () => {
  const filterFull = useListFilter(FILES_FILTER_CONFIG);
  const filterCompact = useListFilter(FILES_FILTER_CONFIG);
  const filterMinimal = useListFilter(FILES_FILTER_CONFIG);
  const filterUltra = useListFilter(FILES_FILTER_CONFIG);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h3 style={SECTION_HEADING_STYLE}>Full (≥400px)</h3>
        <div
          style={{
            width: 500,
            ...PANEL_STYLE,
          }}
        >
          <FilterToolbar
            filter={filterFull}
            config={FILES_FILTER_CONFIG}
            counts={SAMPLE_TYPE_COUNTS}
            quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
            tags={SAMPLE_TAGS}
            layout="full"
          />
        </div>
      </div>

      <div>
        <h3 style={SECTION_HEADING_STYLE}>Compact (300-399px)</h3>
        <div
          style={{
            width: 350,
            ...PANEL_STYLE,
          }}
        >
          <FilterToolbar
            filter={filterCompact}
            config={FILES_FILTER_CONFIG}
            counts={SAMPLE_TYPE_COUNTS}
            quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
            tags={SAMPLE_TAGS}
            layout="compact"
          />
        </div>
      </div>

      <div>
        <h3 style={SECTION_HEADING_STYLE}>Minimal (270-299px)</h3>
        <div
          style={{
            width: 260,
            ...PANEL_STYLE,
          }}
        >
          <FilterToolbar
            filter={filterMinimal}
            config={FILES_FILTER_CONFIG}
            counts={SAMPLE_TYPE_COUNTS}
            quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
            tags={SAMPLE_TAGS}
            layout="minimal"
          />
        </div>
      </div>

      <div>
        <h3 style={SECTION_HEADING_STYLE}>Ultra (&lt;270px)</h3>
        <div
          style={{
            width: 230,
            ...PANEL_STYLE,
          }}
        >
          <FilterToolbar
            filter={filterUltra}
            config={FILES_FILTER_CONFIG}
            counts={SAMPLE_TYPE_COUNTS}
            quickFilterCounts={SAMPLE_QUICK_FILTER_COUNTS}
            tags={SAMPLE_TAGS}
            layout="ultra"
          />
        </div>
      </div>
    </div>
  );
};
