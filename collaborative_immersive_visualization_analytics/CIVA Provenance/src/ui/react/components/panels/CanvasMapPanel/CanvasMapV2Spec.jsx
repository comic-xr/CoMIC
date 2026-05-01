/**
 * @file CanvasMapV2Spec.jsx
 * @description Spec-driven Canvas Map V2 design prototype (storybook-only).
 */

import React, { useState, useMemo, useCallback, useEffect, useId, useRef } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useListFilter } from '@UI/react/hooks/useListFilter';

const makeIcon = (name, extraStyle = {}) => {
  const SpecIcon = ({ style, ...props }) => (
    <Icon name={name} style={{ ...extraStyle, ...style }} {...props} />
  );
  SpecIcon.displayName = `SpecIcon(${name})`;
  return SpecIcon;
};

const Search = makeIcon('search');
const X = makeIcon('close');
const ChevronDown = makeIcon('chevronDown');
const Check = makeIcon('check');
const ArrowDownAZ = makeIcon('sort');
const ArrowUpDown = makeIcon('arrowUpDown');
const Filter = makeIcon('filter');
const Tag = makeIcon('tag');
const Star = makeIcon('star');
const CheckCircle = makeIcon('checkCircle');
const Users = makeIcon('users');
const Link2 = makeIcon('link');
const Compass = makeIcon('compass');
const Grid3X3 = makeIcon('grid3x3');
const Layers = makeIcon('layers');
const Layers2 = makeIcon('layers');
const Home = makeIcon('home');
const Minus = makeIcon('remove');
const Plus = makeIcon('add');
const PanelRightClose = makeIcon('panelRightClose');
const PanelRightOpen = makeIcon('panelRightClose', { transform: 'rotate(180deg)' });
const Database = makeIcon('database');
const Box = makeIcon('box');
const BarChart3 = makeIcon('barChart');
const Table2 = makeIcon('grid');
const Image = makeIcon('image');
const FileText = makeIcon('fileText');
const Radio = makeIcon('radio');
const Circle = makeIcon('circle');
const Move = makeIcon('move');
const GripVertical = makeIcon('gripVertical');
const Grip = makeIcon('grip');
const MousePointer2 = makeIcon('mousePointer');
const Bookmark = makeIcon('bookmark');
const ChevronLeft = makeIcon('chevronLeft');
const ChevronRight = makeIcon('chevronRight');
const ChevronUp = makeIcon('chevronUp');
const Activity = makeIcon('activity');
const Scan = makeIcon('scan');
const Crosshair = makeIcon('crosshair');
const ArrowLeftRight = makeIcon('arrowLeftRight');

const tokens = {
  colors: {
    bg: {
      base: '#020406',
      primary: '#060a12',
      secondary: '#0c1220',
      tertiary: '#121a2e',
      hover: 'rgba(96, 165, 250, 0.08)',
      active: 'rgba(96, 165, 250, 0.15)',
    },
    glass: {
      subtle: 'rgba(96, 165, 250, 0.04)',
      light: 'rgba(96, 165, 250, 0.06)',
      medium: 'rgba(96, 165, 250, 0.10)',
      strong: 'rgba(96, 165, 250, 0.15)',
      panel: 'rgba(6, 10, 18, 0.85)',
      frosted: 'rgba(12, 18, 32, 0.75)',
    },
    border: {
      subtle: 'rgba(96, 165, 250, 0.10)',
      default: 'rgba(96, 165, 250, 0.18)',
      focus: 'rgba(59, 130, 246, 0.5)',
      glow: 'rgba(96, 165, 250, 0.25)',
    },
    text: {
      primary: 'rgba(248, 250, 252, 0.95)',
      secondary: 'rgba(203, 213, 225, 0.8)',
      muted: 'rgba(148, 163, 184, 0.6)',
    },
    accent: {
      blue: '#3b82f6',
      cyan: '#22d3ee',
      purple: '#a855f7',
      amber: '#f59e0b',
      green: '#22c55e',
      red: '#ef4444',
      teal: '#14b8a6',
      pink: '#ec4899',
    },
    canvas: {
      bg: '#030303',
      cell: '#080808',
      cellHover: '#0f0f12',
      gridLine: 'rgba(96, 165, 250, 0.12)',
      gridLineMajor: 'rgba(96, 165, 250, 0.22)',
    },
  },
  radius: { xs: '2px', sm: '4px', md: '6px', lg: '8px', xl: '12px' },
  fontSize: { xs: '9px', sm: '10px', md: '11px', lg: '12px', xl: '13px' },
  spacing: { xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px' },
  blur: { subtle: 'blur(8px)', medium: 'blur(12px)', strong: 'blur(20px)' },
  shadow: {
    glass: '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1)',
    glow: (color) => `0 0 20px ${color}40, 0 0 40px ${color}20`,
    depth: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
};

/**
 * AdaptiveTooltip - VR-compatible tooltip with raycast support and adaptive positioning
 * Works in both desktop (hover) and VR (raycast/pointer) modes
 */
const AdaptiveTooltip = ({ children, content, placement = 'top', delay = 300, disabled = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);
  const tooltipId = useId();

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8;
    const arrowSize = 6;

    // Calculate available space in each direction
    const spaceTop = triggerRect.top;
    const spaceBottom = window.innerHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = window.innerWidth - triggerRect.right;

    // Determine best placement based on available space
    let bestPlacement = placement;
    const tooltipHeight = tooltipRect.height + arrowSize + padding;
    const tooltipWidth = tooltipRect.width + arrowSize + padding;

    if (placement === 'top' && spaceTop < tooltipHeight && spaceBottom > tooltipHeight) {
      bestPlacement = 'bottom';
    } else if (placement === 'bottom' && spaceBottom < tooltipHeight && spaceTop > tooltipHeight) {
      bestPlacement = 'top';
    } else if (placement === 'left' && spaceLeft < tooltipWidth && spaceRight > tooltipWidth) {
      bestPlacement = 'right';
    } else if (placement === 'right' && spaceRight < tooltipWidth && spaceLeft > tooltipWidth) {
      bestPlacement = 'left';
    }

    setActualPlacement(bestPlacement);

    // Calculate position based on placement
    let x, y;
    const centerX = triggerRect.left + triggerRect.width / 2;
    const centerY = triggerRect.top + triggerRect.height / 2;

    switch (bestPlacement) {
      case 'top':
        x = centerX - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - arrowSize - 4;
        break;
      case 'bottom':
        x = centerX - tooltipRect.width / 2;
        y = triggerRect.bottom + arrowSize + 4;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - arrowSize - 4;
        y = centerY - tooltipRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + arrowSize + 4;
        y = centerY - tooltipRect.height / 2;
        break;
      default:
        x = centerX - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - arrowSize - 4;
    }

    // Clamp to viewport
    x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8));

    setPosition({ x, y });
  }, [placement]);

  const show = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay, disabled]);

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (isVisible) {
      // Small delay to allow tooltip to render before measuring
      requestAnimationFrame(calculatePosition);
    }
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (disabled || !content) return children;

  const arrowStyle = {
    position: 'absolute',
    width: 0,
    height: 0,
    ...(actualPlacement === 'top' && {
      bottom: -6,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderTop: `6px solid ${tokens.colors.glass.panel}`,
    }),
    ...(actualPlacement === 'bottom' && {
      top: -6,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderBottom: `6px solid ${tokens.colors.glass.panel}`,
    }),
    ...(actualPlacement === 'left' && {
      right: -6,
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: '6px solid transparent',
      borderBottom: '6px solid transparent',
      borderLeft: `6px solid ${tokens.colors.glass.panel}`,
    }),
    ...(actualPlacement === 'right' && {
      left: -6,
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: '6px solid transparent',
      borderBottom: '6px solid transparent',
      borderRight: `6px solid ${tokens.colors.glass.panel}`,
    }),
  };

  return (
    <>
      {React.cloneElement(children, {
        ref: triggerRef,
        onMouseEnter: show,
        onMouseLeave: hide,
        onPointerEnter: show, // VR raycast support
        onPointerLeave: hide,
        onFocus: show,
        onBlur: hide,
        'aria-describedby': isVisible ? tooltipId : undefined,
      })}
      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 9999,
            padding: '6px 10px',
            background: tokens.colors.glass.panel,
            backdropFilter: tokens.blur.strong,
            WebkitBackdropFilter: tokens.blur.strong,
            border: `1px solid ${tokens.colors.border.glow}`,
            borderRadius: tokens.radius.md,
            boxShadow: `${tokens.shadow.glass}, 0 0 20px rgba(96, 165, 250, 0.15)`,
            color: tokens.colors.text.primary,
            fontSize: tokens.fontSize.sm,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            animation: 'tooltipFadeIn 0.15s ease-out',
          }}
        >
          <div style={arrowStyle} />
          {content}
        </div>
      )}
      <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(${actualPlacement === 'bottom' ? '-4px' : actualPlacement === 'top' ? '4px' : '0'}); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

/**
 * SearchInput - Reusable search input with icon, clear button, and proper styling
 * Prevents icon overlay issues by using proper flexbox layout
 */
const SearchInput = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  autoFocus = false,
  onBlur,
  size = 'default', // 'default' | 'small' | 'compact'
  style = {},
}) => {
  const sizes = {
    default: { height: 32, iconSize: 14, fontSize: tokens.fontSize.sm, padding: tokens.spacing.sm },
    small: { height: 28, iconSize: 12, fontSize: tokens.fontSize.xs, padding: tokens.spacing.xs },
    compact: { height: 24, iconSize: 10, fontSize: tokens.fontSize.xs, padding: '4px' },
  };
  const s = sizes[size] || sizes.default;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: s.height,
        background: tokens.colors.bg.tertiary,
        borderRadius: tokens.radius.md,
        border: `1px solid ${tokens.colors.border.subtle}`,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Icon container - fixed width to prevent overlay */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: s.height,
          height: '100%',
          flexShrink: 0,
          color: tokens.colors.text.muted,
        }}
      >
        <Search size={s.iconSize} />
      </div>

      {/* Input - takes remaining space */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onBlur={onBlur}
        style={{
          flex: 1,
          height: '100%',
          padding: 0,
          paddingRight: s.padding,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: tokens.colors.text.primary,
          fontSize: s.fontSize,
          minWidth: 0,
        }}
      />

      {/* Clear button - only shown when there's a value */}
      {value && (
        <button
          type="button"
          onClick={onClear}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: s.height - 4,
            height: s.height - 4,
            marginRight: 2,
            background: 'transparent',
            border: 'none',
            borderRadius: tokens.radius.sm,
            cursor: 'pointer',
            color: tokens.colors.text.muted,
            flexShrink: 0,
          }}
        >
          <X size={s.iconSize - 2} />
        </button>
      )}
    </div>
  );
};

const VIEW_TYPES = {
  volume: { icon: Box, color: '#a855f7', label: 'Volume', category: 'analysis' },
  slice: { icon: Layers2, color: '#3b82f6', label: 'Slice', category: 'analysis' },
  mpr: { icon: Grid3X3, color: '#22d3ee', label: 'MPR', category: 'analysis' },
  mesh: { icon: Box, color: '#14b8a6', label: '3D Mesh', category: 'visualization' },
  surface: { icon: Layers, color: '#22c55e', label: 'Surface', category: 'visualization' },
  pointcloud: { icon: Circle, color: '#8b5cf6', label: 'Point Cloud', category: 'visualization' },
  chart: { icon: BarChart3, color: '#f59e0b', label: 'Chart', category: 'data' },
  table: { icon: Table2, color: '#3b82f6', label: 'Table', category: 'data' },
  stats: { icon: Activity, color: '#22c55e', label: 'Statistics', category: 'data' },
  image: { icon: Image, color: '#ec4899', label: 'Image', category: 'media' },
  annotation: { icon: FileText, color: '#f59e0b', label: 'Annotation', category: 'media' },
};

const QUICK_FILTERS = [
  { id: 'active', label: 'Active', icon: CheckCircle, predicate: (item) => item.isActive !== false },
  { id: 'linked', label: 'Linked', icon: Link2, predicate: (item) => item.isLinked },
  { id: 'shared', label: 'Shared', icon: Users, predicate: (item) => item.isShared },
  { id: 'starred', label: 'Starred', icon: Star, predicate: (item) => item.isStarred },
];

const SORT_OPTIONS = [
  {
    value: 'position',
    label: 'Position (A1->)',
    shortLabel: 'Position',
    icon: Grid3X3,
    comparator: (a, b) => {
      const ap = (a.position?.row ?? a.canvasRow ?? 99) * 100 + (a.position?.col ?? a.canvasCol ?? 99);
      const bp = (b.position?.row ?? b.canvasRow ?? 99) * 100 + (b.position?.col ?? b.canvasCol ?? 99);
      return ap - bp;
    },
  },
  {
    value: 'name-asc',
    label: 'Name (A->Z)',
    shortLabel: 'Name up',
    icon: ArrowDownAZ,
    comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    value: 'name-desc',
    label: 'Name (Z->A)',
    shortLabel: 'Name down',
    icon: ArrowDownAZ,
    comparator: (a, b) => (b.name || '').localeCompare(a.name || ''),
  },
  {
    value: 'type',
    label: 'By Type',
    shortLabel: 'Type',
    icon: Layers,
    comparator: (a, b) => {
      const at = (a.type || a.views?.[0]?.type || '');
      const bt = (b.type || b.views?.[0]?.type || '');
      return at.localeCompare(bt);
    },
  },
  {
    value: 'recent',
    label: 'Recently Modified',
    shortLabel: 'Recent',
    icon: ArrowUpDown,
    comparator: () => 0,
  },
];

const CANVAS = { rows: 10, cols: 10 };

const MOCK_VIEWGROUPS = [
  {
    id: 'vg-1',
    name: 'Brain Analysis',
    color: '#a855f7',
    isExplicit: true,
    layoutId: '1+2',
    position: { row: 0, col: 0, rowSpan: 3, colSpan: 4 },
    views: [
      { id: 'v-1', type: 'volume', name: 'Main Volume', gridPos: { row: 0, col: 0, rowSpan: 2, colSpan: 2 } },
      { id: 'v-2', type: 'slice', name: 'Axial Slice', gridPos: { row: 0, col: 2, rowSpan: 1, colSpan: 2 } },
      { id: 'v-3', type: 'stats', name: 'ROI Statistics', gridPos: { row: 1, col: 2, rowSpan: 1, colSpan: 2 } },
    ],
    isActive: true,
    isLinked: true,
    isShared: true,
    isStarred: true,
    tags: ['brain', 'mri'],
  },
  {
    id: 'vg-2',
    name: 'Data Explorer',
    color: '#22c55e',
    isExplicit: true,
    layoutId: 'side-by-side',
    position: { row: 0, col: 5, rowSpan: 2, colSpan: 4 },
    views: [
      { id: 'v-4', type: 'chart', name: 'Timeline Chart', gridPos: { row: 0, col: 0, rowSpan: 2, colSpan: 2 } },
      { id: 'v-5', type: 'table', name: 'Data Table', gridPos: { row: 0, col: 2, rowSpan: 2, colSpan: 2 } },
    ],
    isActive: true,
    isLinked: false,
    isShared: false,
    isStarred: false,
    tags: ['analysis'],
  },
  {
    id: 'vg-3',
    name: 'Heart Mesh',
    color: '#ef4444',
    isExplicit: false,
    layoutId: 'single',
    position: { row: 4, col: 1, rowSpan: 3, colSpan: 3 },
    views: [
      { id: 'v-6', type: 'mesh', name: 'Heart 3D Model', gridPos: { row: 0, col: 0, rowSpan: 3, colSpan: 3 } },
    ],
    isActive: true,
    isLinked: true,
    isShared: true,
    isStarred: false,
    tags: ['cardiac'],
  },
  {
    id: 'vg-4',
    name: 'Reference Images',
    color: '#f59e0b',
    isExplicit: true,
    layoutId: '2x2',
    position: { row: 5, col: 5, rowSpan: 4, colSpan: 4 },
    views: [
      { id: 'v-7', type: 'image', name: 'X-Ray Chest', gridPos: { row: 0, col: 0, rowSpan: 2, colSpan: 2 } },
      { id: 'v-8', type: 'image', name: 'CT Slice', gridPos: { row: 0, col: 2, rowSpan: 2, colSpan: 2 } },
      { id: 'v-9', type: 'image', name: 'MRI T1', gridPos: { row: 2, col: 0, rowSpan: 2, colSpan: 2 } },
      { id: 'v-10', type: 'annotation', name: 'Clinical Notes', gridPos: { row: 2, col: 2, rowSpan: 2, colSpan: 2 } },
    ],
    isActive: false,
    isLinked: false,
    isShared: false,
    isStarred: true,
    tags: ['ct', 'mri', 'reference'],
  },
];

const MOCK_DATASETS = [
  { id: 'ds-1', name: 'brain_scan_001.nii', type: 'nifti', size: '52 MB', isLoaded: true },
  { id: 'ds-2', name: 'patient_metrics.csv', type: 'csv', size: '1.2 MB', isLoaded: true },
  { id: 'ds-3', name: 'heart_mesh.vtk', type: 'vtk', size: '15 MB', isLoaded: true },
  { id: 'ds-4', name: 'xray_chest.png', type: 'image', size: '2 MB', isLoaded: false },
  { id: 'ds-5', name: 'ct_series.dcm', type: 'dicom', size: '125 MB', isLoaded: false },
];

const MOCK_UNPLACED_VIEWS = [
  { id: 'uv-1', type: 'volume', name: 'Spine Volume', datasetId: 'ds-7', isActive: true, isLinked: false, isShared: false, isStarred: false },
  { id: 'uv-2', type: 'chart', name: 'Trend Analysis', datasetId: null, isActive: true, isLinked: false, isShared: false, isStarred: true },
];

const MOCK_VIEWPORT = {
  id: 'main',
  name: 'Main',
  position: { row: 0, col: 0 },
  size: { rows: 5, cols: 5 },
  isPrimary: true,
};

const MOCK_VIEWPORTS = [
  {
    id: 'main',
    name: 'Main',
    position: { row: 0, col: 0 },
    size: { rows: 5, cols: 5 },
    isPrimary: true,
  },
  {
    id: 'detail',
    name: 'Detail',
    position: { row: 3, col: 4 },
    size: { rows: 3, cols: 3 },
    isPrimary: false,
  },
];

const MOCK_COLLABORATORS = [
  { id: 'u-1', name: 'Alice Chen', color: '#22c55e', avatar: 'AC', viewportPos: { row: 2, col: 3 }, cursorPos: { row: 2.5, col: 4.2 }, isOnline: true, isBroadcasting: true },
  { id: 'u-2', name: 'Bob Smith', color: '#3b82f6', avatar: 'BS', viewportPos: { row: 5, col: 5 }, cursorPos: { row: 6.1, col: 7.3 }, isOnline: true, isBroadcasting: false },
  { id: 'u-3', name: 'Carol Davis', color: '#f59e0b', avatar: 'CD', viewportPos: null, cursorPos: null, isOnline: false, isBroadcasting: false },
];

const MOCK_BOOKMARKS = [
  { id: 'bm-1', name: 'Brain Overview', position: { row: 0, col: 0 }, isStarred: true, isActive: true },
  { id: 'bm-2', name: 'Heart Detail', position: { row: 4, col: 1 }, isStarred: false, isActive: true },
  { id: 'bm-3', name: 'Reference Gallery', position: { row: 5, col: 5 }, isStarred: true, isActive: true },
];

const MOCK_VG_LINKS = [
  { id: 'link-1', from: 'vg-1', to: 'vg-3', type: 'camera', mode: 'bidirectional' },
  { id: 'link-2', from: 'vg-1', to: 'vg-2', type: 'filter', mode: 'unidirectional' },
];

const MAP_MODES = { NAVIGATE: 'navigate', LAYOUT: 'layout', LINKS: 'links', TEAM: 'team' };
const DISPLAY_MODES = { VG: 'vg', VIEW: 'view' };
const COMPANION_TABS = { VIEWS: 'views', DATASETS: 'datasets' };

const MODE_CONFIG = {
  [MAP_MODES.NAVIGATE]: { label: 'Navigate', icon: Compass, color: tokens.colors.accent.blue },
  [MAP_MODES.LAYOUT]: { label: 'Layout', icon: Grid3X3, color: tokens.colors.accent.purple },
  [MAP_MODES.LINKS]: { label: 'Links', icon: Link2, color: tokens.colors.accent.cyan },
  [MAP_MODES.TEAM]: { label: 'Team', icon: Users, color: tokens.colors.accent.green },
};

const colToLetter = (col) => String.fromCharCode(65 + col);
const formatCellRef = (row, col) => `${colToLetter(col)}${row + 1}`;

const flattenViewsToCanvas = (viewGroups) => {
  const views = [];
  viewGroups.forEach((vg) => {
    if (!vg.position) return;
    (vg.views || []).forEach((view) => {
      const gp = view.gridPos || { row: 0, col: 0, rowSpan: 1, colSpan: 1 };
      views.push({
        ...view,
        vgId: vg.id,
        vgName: vg.name,
        vgColor: vg.color,
        canvasRow: vg.position.row + gp.row,
        canvasCol: vg.position.col + gp.col,
        rowSpan: gp.rowSpan || 1,
        colSpan: gp.colSpan || 1,
      });
    });
  });
  return views;
};

const FilterToolbar = ({
  filter,
  sizeMode,
  tagOptions = [],
  showQuickFilters = true,
  dense = false,
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const isCompact = sizeMode === 'compact';
  const isMinimal = sizeMode === 'minimal';
  const currentSort = filter.currentSortOption || SORT_OPTIONS.find((o) => o.value === filter.sortBy);
  const paddingY = dense ? tokens.spacing.xs : tokens.spacing.sm;
  const controlFontSize = dense ? tokens.fontSize.xs : tokens.fontSize.sm;
  const quickCount = filter.quickFilters.length;
  const tagCount = filter.selectedTags.length;
  const hasTags = tagOptions.length > 0;

  // In dense mode, search is icon-only until expanded
  const showSearchInput = !dense || searchExpanded || filter.searchQuery;

  return (
    <div style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.xs,
          padding: `${paddingY} ${dense ? tokens.spacing.sm : tokens.spacing.md}`,
          background: tokens.colors.bg.secondary,
        }}
      >
        {/* Search - icon-only in dense mode, expands on click */}
        {dense && !showSearchInput ? (
          <AdaptiveTooltip content="Search" placement="bottom">
            <button
              type="button"
              onClick={() => setSearchExpanded(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                background: tokens.colors.bg.tertiary,
                borderRadius: tokens.radius.md,
                border: `1px solid ${tokens.colors.border.subtle}`,
                color: tokens.colors.text.muted,
                cursor: 'pointer',
              }}
            >
              <Search size={12} />
            </button>
          </AdaptiveTooltip>
        ) : (
          <SearchInput
            value={filter.searchQuery}
            onChange={filter.setSearchQuery}
            onClear={() => { filter.setSearchQuery(''); if (dense) setSearchExpanded(false); }}
            autoFocus={dense && searchExpanded}
            onBlur={() => { if (dense && !filter.searchQuery) setSearchExpanded(false); }}
            size={dense ? 'small' : 'default'}
            style={{ flex: 1, minWidth: 0 }}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'filters' ? null : 'filters')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                background: quickCount ? tokens.colors.glass.strong : 'transparent',
                border: `1px solid ${quickCount ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
                borderRadius: tokens.radius.md,
                color: quickCount ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                cursor: 'pointer',
                fontSize: controlFontSize,
              }}
            >
              <Filter size={12} />
              {!isMinimal && !dense && <span>Filter</span>}
              {quickCount > 0 && (
                <span
                  style={{
                    padding: '0 6px',
                    borderRadius: tokens.radius.lg,
                    background: 'rgba(59,130,246,0.2)',
                    color: tokens.colors.accent.blue,
                    fontSize: tokens.fontSize.xs,
                    fontWeight: 600,
                  }}
                >
                  {quickCount}
                </span>
              )}
            </button>
            {activeDropdown === 'filters' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  zIndex: 1000,
                  width: 180,
                  background: tokens.colors.bg.primary,
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.lg,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  padding: tokens.spacing.xs,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {QUICK_FILTERS.map((qf) => {
                    const isActive = filter.quickFilters.includes(qf.id);
                    const QfIcon = qf.icon;
                    return (
                      <button
                        key={qf.id}
                        type="button"
                        onClick={() => filter.toggleQuickFilter(qf.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 8px',
                          borderRadius: tokens.radius.md,
                          border: `1px solid ${isActive ? tokens.colors.accent.blue : 'transparent'}`,
                          background: isActive ? tokens.colors.glass.strong : 'transparent',
                          color: isActive ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                          cursor: 'pointer',
                          fontSize: tokens.fontSize.sm,
                        }}
                      >
                        <QfIcon size={12} />
                        <span style={{ flex: 1, textAlign: 'left' }}>{qf.label}</span>
                        {isActive && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {hasTags && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'tags' ? null : 'tags')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                  background: tagCount ? tokens.colors.glass.strong : 'transparent',
                  border: `1px solid ${tagCount ? tokens.colors.accent.cyan : tokens.colors.border.subtle}`,
                  borderRadius: tokens.radius.md,
                  color: tagCount ? tokens.colors.accent.cyan : tokens.colors.text.secondary,
                  cursor: 'pointer',
                  fontSize: controlFontSize,
                }}
              >
                <Tag size={12} />
                {!isMinimal && !dense && <span>Tags</span>}
                {tagCount > 0 && (
                  <span
                    style={{
                      padding: '0 6px',
                      borderRadius: tokens.radius.lg,
                      background: 'rgba(34,211,238,0.18)',
                      color: tokens.colors.accent.cyan,
                      fontSize: tokens.fontSize.xs,
                      fontWeight: 600,
                    }}
                  >
                    {tagCount}
                  </span>
                )}
              </button>
              {activeDropdown === 'tags' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    zIndex: 1000,
                    width: 200,
                    background: tokens.colors.bg.primary,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.radius.lg,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    padding: tokens.spacing.sm,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: tokens.spacing.xs,
                  }}
                >
                  {tagOptions.map((tag) => {
                    const isActive = filter.selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => filter.toggleTag(tag)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: tokens.radius.lg,
                          border: `1px solid ${isActive ? tokens.colors.accent.cyan : tokens.colors.border.subtle}`,
                          background: isActive ? tokens.colors.glass.strong : tokens.colors.glass.subtle,
                          color: isActive ? tokens.colors.accent.cyan : tokens.colors.text.secondary,
                          fontSize: tokens.fontSize.xs,
                          cursor: 'pointer',
                        }}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                background: 'transparent',
                border: `1px solid ${tokens.colors.border.subtle}`,
                borderRadius: tokens.radius.md,
                color: tokens.colors.text.secondary,
                cursor: 'pointer',
                fontSize: controlFontSize,
              }}
            >
              <ArrowUpDown size={12} />
              {!isCompact && !isMinimal && <span>{currentSort?.shortLabel}</span>}
              <ChevronDown size={10} />
            </button>

            {activeDropdown === 'sort' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  zIndex: 1000,
                  width: 180,
                  background: tokens.colors.bg.primary,
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.lg,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  padding: tokens.spacing.xs,
                }}
              >
                {SORT_OPTIONS.map((opt) => {
                  const isActive = filter.sortBy === opt.value;
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        filter.setSortBy(opt.value);
                        setActiveDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing.sm,
                        width: '100%',
                        padding: '8px 10px',
                        background: isActive ? tokens.colors.glass.medium : 'transparent',
                        border: 'none',
                        borderRadius: tokens.radius.sm,
                        color: isActive ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <OptIcon size={12} />
                      <span style={{ flex: 1, fontSize: tokens.fontSize.sm }}>{opt.label}</span>
                      {isActive && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {filter.hasActiveFilters && (
          <button
            type="button"
            onClick={filter.clearAll}
            style={{
              padding: tokens.spacing.xs,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: tokens.colors.text.muted,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showQuickFilters && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.xs,
            padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
            background: tokens.colors.glass.subtle,
            flexWrap: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, flexShrink: 0 }}>
            Quick:
          </span>
          {QUICK_FILTERS.map((qf) => {
            const isActive = filter.quickFilters.includes(qf.id);
            const QfIcon = qf.icon;
            return (
              <AdaptiveTooltip key={qf.id} content={qf.label} placement="bottom">
                <button
                  type="button"
                  onClick={() => filter.toggleQuickFilter(qf.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    background: isActive ? tokens.colors.glass.strong : tokens.colors.glass.subtle,
                    border: `1px solid ${isActive ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.md,
                    color: isActive ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                    cursor: 'pointer',
                  }}
                >
                  <QfIcon size={12} />
                </button>
              </AdaptiveTooltip>
            );
          })}
        </div>
      )}
    </div>
  );
};

const GridPaperBackground = ({ rows, cols, cellSize, gap, visible, minorColor, majorColor, offsetX = 0, offsetY = 0 }) => {
  const patternId = useId();
  if (!visible) return null;
  const gridWidth = cols * (cellSize + gap) - gap;
  const gridHeight = rows * (cellSize + gap) - gap;
  const majorInterval = 5;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        shapeRendering: 'crispEdges',
      }}
    >
      <defs>
        <pattern
          id={`${patternId}-minor`}
          width={cellSize + gap}
          height={cellSize + gap}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offsetX} ${offsetY})`}
        >
          <path
            d={`M ${cellSize + gap} 0 L 0 0 0 ${cellSize + gap}`}
            fill="none"
            stroke={minorColor || tokens.colors.canvas.gridLine}
            strokeWidth="0.5"
          />
        </pattern>
        <pattern
          id={`${patternId}-major`}
          width={(cellSize + gap) * majorInterval}
          height={(cellSize + gap) * majorInterval}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offsetX} ${offsetY})`}
        >
          <rect
            width={(cellSize + gap) * majorInterval}
            height={(cellSize + gap) * majorInterval}
            fill={`url(#${patternId}-minor)`}
          />
          <path
            d={`M ${(cellSize + gap) * majorInterval} 0 L 0 0 0 ${(cellSize + gap) * majorInterval}`}
            fill="none"
            stroke={majorColor || tokens.colors.canvas.gridLineMajor}
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width={gridWidth} height={gridHeight} fill={`url(#${patternId}-major)`} />
      <rect x="0" y="0" width={gridWidth} height={gridHeight} fill="none" stroke={tokens.colors.canvas.gridLineMajor} strokeWidth="1" />
    </svg>
  );
};

const DPadControls = ({ position, onMove, onGoHome, homePosition, compact }) => {
  const isAtHome = position.row === homePosition.row && position.col === homePosition.col;
  const size = compact ? 24 : 28;

  const btnStyle = {
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.colors.glass.medium,
    border: `1px solid ${tokens.colors.border.subtle}`,
    borderRadius: tokens.radius.sm,
    color: tokens.colors.text.secondary,
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <button type="button" onClick={() => onMove('up')} style={btnStyle}>
        <ChevronUp size={compact ? 12 : 14} />
      </button>
      <div style={{ display: 'flex', gap: '2px' }}>
        <button type="button" onClick={() => onMove('left')} style={btnStyle}>
          <ChevronLeft size={compact ? 12 : 14} />
        </button>
        <button
          type="button"
          onClick={onGoHome}
          style={{
            ...btnStyle,
            background: isAtHome ? `${tokens.colors.accent.amber}30` : tokens.colors.glass.medium,
            color: isAtHome ? tokens.colors.accent.amber : tokens.colors.text.muted,
            border: isAtHome ? `1px solid ${tokens.colors.accent.amber}` : btnStyle.border,
          }}
        >
          <Home size={compact ? 10 : 12} />
        </button>
        <button type="button" onClick={() => onMove('right')} style={btnStyle}>
          <ChevronRight size={compact ? 12 : 14} />
        </button>
      </div>
      <button type="button" onClick={() => onMove('down')} style={btnStyle}>
        <ChevronDown size={compact ? 12 : 14} />
      </button>
    </div>
  );
};

const FloatingDPad = ({
  sizeMode,
  position,
  zIndex = 30,
  docked = false,
  showHandle = true,
  centerContent,
  onMove,
  onGoHome,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
}) => {
  const size = sizeMode === 'minimal' ? 70 : sizeMode === 'compact' ? 82 : 96;
  const centerSize = sizeMode === 'minimal' ? 34 : sizeMode === 'compact' ? 38 : 42;
  const handleSize = sizeMode === 'minimal' ? 18 : 20;
  const iconSize = sizeMode === 'minimal' ? 14 : sizeMode === 'compact' ? 16 : 18;
  const wedgeInset = sizeMode === 'minimal' ? 3 : sizeMode === 'compact' ? 4 : 5;
  const rotation = 0;
  const iconOffset = sizeMode === 'minimal' ? 14 : sizeMode === 'compact' ? 16 : 18;

  const wedgeStyle = {
    position: 'absolute',
    inset: wedgeInset,
    borderRadius: '50%',
    border: `1px solid rgba(96,165,250,0.18)`,
    background: 'linear-gradient(160deg, rgba(96,165,250,0.22), rgba(10,16,28,0.65))',
    color: 'rgba(248, 250, 252, 0.95)',
    textShadow: '0 1px 6px rgba(15,23,42,0.8)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(6px)',
    transition: 'all 0.18s ease',
  };

  return (
    <div
      style={{
        position: docked ? 'relative' : 'absolute',
        left: docked ? undefined : position?.x,
        top: docked ? undefined : position?.y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(96,165,250,0.18), rgba(2,6,16,0.92))',
        border: '1px solid rgba(96,165,250,0.2)',
        boxShadow: '0 0 0 2px rgba(15,23,42,0.6), 0 12px 24px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center',
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '1px solid rgba(96,165,250,0.18)',
          boxShadow: 'inset 0 0 0 1px rgba(2,6,16,0.65)',
          pointerEvents: 'none',
        }}
      />
      <button
        type="button"
        onClick={() => onMove('up')}
        style={{
          ...wedgeStyle,
          clipPath: 'polygon(50% 50%, 0% 0%, 100% 0%)',
        }}
      >
        <ChevronUp
          size={iconSize}
          style={{
            transform: `rotate(-${rotation}deg) translateY(-${iconOffset}px)`,
            color: 'rgba(248, 250, 252, 0.95)',
          }}
        />
      </button>
      <button
        type="button"
        onClick={() => onMove('right')}
        style={{
          ...wedgeStyle,
          clipPath: 'polygon(50% 50%, 100% 0%, 100% 100%)',
        }}
      >
        <ChevronRight
          size={iconSize}
          style={{
            transform: `rotate(-${rotation}deg) translateX(${iconOffset}px)`,
            color: 'rgba(248, 250, 252, 0.95)',
          }}
        />
      </button>
      <button
        type="button"
        onClick={() => onMove('down')}
        style={{
          ...wedgeStyle,
          clipPath: 'polygon(50% 50%, 100% 100%, 0% 100%)',
        }}
      >
        <ChevronDown
          size={iconSize}
          style={{
            transform: `rotate(-${rotation}deg) translateY(${iconOffset}px)`,
            color: 'rgba(248, 250, 252, 0.95)',
          }}
        />
      </button>
      <button
        type="button"
        onClick={() => onMove('left')}
        style={{
          ...wedgeStyle,
          clipPath: 'polygon(50% 50%, 0% 100%, 0% 0%)',
        }}
      >
        <ChevronLeft
          size={iconSize}
          style={{
            transform: `rotate(-${rotation}deg) translateX(-${iconOffset}px)`,
            color: 'rgba(248, 250, 252, 0.95)',
          }}
        />
      </button>
      <div
        style={{
          position: 'absolute',
          top: wedgeInset + 1,
          bottom: wedgeInset + 1,
          left: '50%',
          width: 1,
          transform: 'translateX(-0.5px)',
          background: 'rgba(5, 8, 16, 0.6)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: wedgeInset + 1,
          right: wedgeInset + 1,
          top: '50%',
          height: 1,
          transform: 'translateY(-0.5px)',
          background: 'rgba(5, 8, 16, 0.6)',
          pointerEvents: 'none',
        }}
      />
      <button
        type="button"
        onClick={onGoHome}
        style={{
          width: centerSize,
          height: centerSize,
          borderRadius: '50%',
          border: `1px solid rgba(96,165,250,0.45)`,
          background: 'radial-gradient(circle at 35% 35%, rgba(96,165,250,0.4), rgba(8,14,24,0.95))',
          color: tokens.colors.accent.amber,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 0 18px rgba(59,130,246,0.45)',
          zIndex: 2,
          transform: `rotate(-${rotation}deg)`,
        }}
      >
        {centerContent || <Home size={iconSize} style={{ color: tokens.colors.accent.amber }} />}
      </button>
      {showHandle && (
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerLeave={onHandlePointerUp}
          style={{
            position: 'absolute',
            right: -4,
            top: -4,
            width: handleSize,
            height: handleSize,
            borderRadius: '50%',
            background: tokens.colors.bg.secondary,
            border: `1px solid ${tokens.colors.border.subtle}`,
            color: tokens.colors.text.muted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
          }}
        >
          <Grip size={10} />
        </div>
      )}
    </div>
  );
};

const SquareDPad = ({ sizeMode, onMove, onGoHome, centerLabel, isAtHome }) => {
  const size = sizeMode === 'minimal' ? 76 : sizeMode === 'compact' ? 88 : 100;
  const centerSize = Math.round(size * 0.38);
  const cornerRadius = 6;
  const gap = 2;
  const cx = size / 2;
  const cy = size / 2;

  const [hoveredQuadrant, setHoveredQuadrant] = useState(null);
  const [activeQuadrant, setActiveQuadrant] = useState(null);

  const getQuadrantColor = (quadrant) => {
    if (activeQuadrant === quadrant) return tokens.colors.accent.cyan;
    if (hoveredQuadrant === quadrant) return tokens.colors.accent.blue;
    return tokens.colors.glass.medium;
  };

  const getIconColor = (quadrant) => {
    if (hoveredQuadrant === quadrant || activeQuadrant === quadrant) return 'white';
    return tokens.colors.text.muted;
  };

  const handleClick = (direction) => {
    setActiveQuadrant(direction);
    setTimeout(() => setActiveQuadrant(null), 150);
    onMove(direction);
  };

  const quadrants = [
    {
      id: 'up',
      points: `${gap},${gap} ${size - gap},${gap} ${cx + centerSize / 2 + gap},${cy - centerSize / 2 - gap} ${
        cx - centerSize / 2 - gap
      },${cy - centerSize / 2 - gap}`,
      iconX: cx,
      iconY: (gap + cy - centerSize / 2 - gap) / 2 + 2,
    },
    {
      id: 'right',
      points: `${size - gap},${gap} ${size - gap},${size - gap} ${cx + centerSize / 2 + gap},${cy + centerSize / 2 + gap} ${
        cx + centerSize / 2 + gap
      },${cy - centerSize / 2 - gap}`,
      iconX: (size - gap + cx + centerSize / 2 + gap) / 2 - 2,
      iconY: cy,
    },
    {
      id: 'down',
      points: `${size - gap},${size - gap} ${gap},${size - gap} ${cx - centerSize / 2 - gap},${cy + centerSize / 2 + gap} ${
        cx + centerSize / 2 + gap
      },${cy + centerSize / 2 + gap}`,
      iconX: cx,
      iconY: (size - gap + cy + centerSize / 2 + gap) / 2 - 2,
    },
    {
      id: 'left',
      points: `${gap},${size - gap} ${gap},${gap} ${cx - centerSize / 2 - gap},${cy - centerSize / 2 - gap} ${
        cx - centerSize / 2 - gap
      },${cy + centerSize / 2 + gap}`,
      iconX: (gap + cx - centerSize / 2 - gap) / 2 + 2,
      iconY: cy,
    },
  ];

  const getChevronPath = (direction) => {
    const s = Math.max(6, size * 0.09);
    switch (direction) {
      case 'up':
        return `M ${-s} ${s / 2} L 0 ${-s / 2} L ${s} ${s / 2}`;
      case 'down':
        return `M ${-s} ${-s / 2} L 0 ${s / 2} L ${s} ${-s / 2}`;
      case 'left':
        return `M ${s / 2} ${-s} L ${-s / 2} 0 L ${s / 2} ${s}`;
      case 'right':
        return `M ${-s / 2} ${-s} L ${s / 2} 0 L ${-s / 2} ${s}`;
      default:
        return '';
    }
  };

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <rect
        x={1}
        y={1}
        width={size - 2}
        height={size - 2}
        rx={cornerRadius}
        fill={tokens.colors.bg.tertiary}
        stroke={tokens.colors.border.default}
        strokeWidth={1}
      />

      {quadrants.map((q) => (
        <g key={q.id}>
          <polygon
            points={q.points}
            fill={getQuadrantColor(q.id)}
            stroke={tokens.colors.border.subtle}
            strokeWidth={0.5}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredQuadrant(q.id)}
            onMouseLeave={() => setHoveredQuadrant(null)}
            onClick={() => handleClick(q.id)}
          />
          <path
            d={getChevronPath(q.id)}
            transform={`translate(${q.iconX}, ${q.iconY})`}
            fill="none"
            stroke={getIconColor(q.id)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        </g>
      ))}

      <rect
        x={cx - centerSize / 2}
        y={cy - centerSize / 2}
        width={centerSize}
        height={centerSize}
        rx={4}
        fill={isAtHome ? `${tokens.colors.accent.amber}30` : tokens.colors.bg.secondary}
        stroke={isAtHome ? tokens.colors.accent.amber : tokens.colors.border.default}
        strokeWidth={1.5}
        style={{ cursor: 'pointer' }}
        onClick={onGoHome}
      />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={isAtHome ? tokens.colors.accent.amber : tokens.colors.text.primary}
        fontSize={Math.max(11, size * 0.16)}
        fontWeight="700"
        fontFamily="monospace"
        style={{ pointerEvents: 'none' }}
      >
        {centerLabel || 'A1'}
      </text>
    </svg>
  );
};

  const MapSidebar = ({
    side,
    onToggleSide,
    showItems = [],
    panelToggle, // Separate toggle for companion panel - goes above Show section
  }) => {
  // Glassmorphic button style
  const btnStyle = {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.border.subtle}`,
    background: tokens.colors.glass.light,
    backdropFilter: tokens.blur.subtle,
    WebkitBackdropFilter: tokens.blur.subtle,
    color: tokens.colors.text.muted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  // Active button style with glow
  const getActiveStyle = (isActive, accentColor) => ({
    ...btnStyle,
    border: `1px solid ${isActive ? accentColor : tokens.colors.border.subtle}`,
    background: isActive ? `${accentColor}18` : tokens.colors.glass.light,
    color: isActive ? accentColor : tokens.colors.text.muted,
    boxShadow: isActive ? `0 0 12px ${accentColor}40, inset 0 1px 0 rgba(255,255,255,0.1)` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
  });

  return (
    <div
      style={{
        width: 56,
        display: 'flex',
        justifyContent: 'center',
        overflow: 'visible',
        background:
          side === 'left'
            ? 'linear-gradient(90deg, rgba(6,10,18,0.0), rgba(6,10,18,0.55))'
            : 'linear-gradient(270deg, rgba(6,10,18,0.0), rgba(6,10,18,0.55))',
      }}
    >
      <div
        style={{
          padding: 5,
          borderRadius: tokens.radius.lg,
          border: `1px solid ${tokens.colors.border.glow}`,
          background: tokens.colors.glass.frosted,
          backdropFilter: tokens.blur.strong,
          WebkitBackdropFilter: tokens.blur.strong,
          boxShadow: `${tokens.shadow.glass}, inset 0 1px 0 rgba(255,255,255,0.08)`,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        {/* Panel toggle button - above Show section */}
        {panelToggle && (
          <>
            <AdaptiveTooltip content={panelToggle.label} placement={side === 'left' ? 'right' : 'left'}>
              <button
                type="button"
                onClick={panelToggle.onClick}
                style={getActiveStyle(panelToggle.active, tokens.colors.accent.cyan)}
              >
                <panelToggle.icon size={14} />
              </button>
            </AdaptiveTooltip>
            <div style={{ width: '100%', height: 1, background: `linear-gradient(90deg, transparent, ${tokens.colors.border.default}, transparent)` }} />
          </>
        )}

        {/* Show section */}
        {showItems.length > 0 && (
          <>
            <div style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Show</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {showItems.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <AdaptiveTooltip key={`${item.label}-${idx}`} content={item.label} placement={side === 'left' ? 'right' : 'left'}>
                    <button
                      type="button"
                      onClick={item.onClick}
                      style={getActiveStyle(item.active, tokens.colors.accent.blue)}
                    >
                      <ItemIcon size={14} />
                    </button>
                  </AdaptiveTooltip>
                );
              })}
            </div>
          </>
        )}

        {/* Spacer to push toggle-side button to bottom */}
        <div style={{ flex: 1 }} />

        {/* Move to other side button - at bottom */}
        <div style={{ width: '100%', height: 1, background: `linear-gradient(90deg, transparent, ${tokens.colors.border.default}, transparent)` }} />
        <AdaptiveTooltip content={`Move to ${side === 'left' ? 'right' : 'left'}`} placement={side === 'left' ? 'right' : 'left'}>
          <button type="button" onClick={onToggleSide} style={btnStyle}>
            <ArrowLeftRight size={14} />
          </button>
        </AdaptiveTooltip>
      </div>
    </div>
  );
};

const CompanionPanel = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  viewGroups,
  unplacedViews,
  datasets,
  sizeMode,
  width = 180,
  showToolbar = true,
  onDragStart,
  overlay = false, // When true, panel overlays the minimap instead of pushing it
  side = 'right', // Which side the companion panel appears on
}) => {
  if (!isOpen) return null;

  const companionFilter = useListFilter({
    searchFields: (item) => [item.name, item.type, ...(item.tags || [])],
    quickFilterDefs: QUICK_FILTERS,
    sortOptions: SORT_OPTIONS,
  });

  const allViews = useMemo(() => {
    const placed = viewGroups.flatMap((vg) =>
      (vg.views || []).map((view) => ({
        ...view,
        vgId: vg.id,
        vgName: vg.name,
        vgColor: vg.color,
        isPlaced: true,
        isActive: vg.isActive,
        isLinked: vg.isLinked,
        isShared: vg.isShared,
        isStarred: vg.isStarred,
      }))
    );
    const unplaced = unplacedViews.map((view) => ({ ...view, isPlaced: false }));
    return [...placed, ...unplaced];
  }, [viewGroups, unplacedViews]);

  const datasetsWithTags = useMemo(
    () => datasets.map((ds) => ({ ...ds, tags: [ds.type] })),
    [datasets]
  );
  const viewTags = useMemo(() => Array.from(new Set(allViews.flatMap((view) => view.tags || []))), [allViews]);
  const datasetTags = useMemo(() => Array.from(new Set(datasets.map((ds) => ds.type))), [datasets]);
  const tagOptions = activeTab === COMPANION_TABS.DATASETS ? datasetTags : viewTags;

  const filteredViews = companionFilter.applyFilters(allViews);
  const filteredDatasets = companionFilter.applyFilters(datasetsWithTags);

  const isLeftSide = side === 'left';

  return (
    <div
      style={{
        width,
        background: tokens.colors.glass.frosted,
        backdropFilter: tokens.blur.strong,
        WebkitBackdropFilter: tokens.blur.strong,
        borderLeft: isLeftSide ? 'none' : `1px solid ${tokens.colors.border.glow}`,
        borderRight: isLeftSide ? `1px solid ${tokens.colors.border.glow}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // Overlay positioning
        ...(overlay && {
          position: 'absolute',
          top: 0,
          [isLeftSide ? 'left' : 'right']: 0,
          bottom: 0,
          zIndex: 20,
          boxShadow: isLeftSide
            ? `4px 0 24px rgba(0, 0, 0, 0.5), 0 0 1px rgba(96, 165, 250, 0.2), inset -1px 0 0 rgba(255,255,255,0.05)`
            : `-4px 0 24px rgba(0, 0, 0, 0.5), 0 0 1px rgba(96, 165, 250, 0.2), inset 1px 0 0 rgba(255,255,255,0.05)`,
        }),
      }}
    >
      <div style={{ display: 'flex', borderBottom: `1px solid ${tokens.colors.border.default}`, background: tokens.colors.glass.subtle }}>
        {[
          { id: COMPANION_TABS.VIEWS, label: 'Views', icon: Layers, count: allViews.length },
          { id: COMPANION_TABS.DATASETS, label: 'Data', icon: Database, count: datasets.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <AdaptiveTooltip key={tab.id} content={`${tab.label} (${tab.count})`} placement="bottom">
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: tokens.spacing.sm,
                  background: isActive ? tokens.colors.glass.medium : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? tokens.colors.accent.blue : 'transparent'}`,
                  color: isActive ? tokens.colors.accent.blue : tokens.colors.text.muted,
                  cursor: 'pointer',
                  fontSize: tokens.fontSize.xs,
                }}
              >
                <TabIcon size={12} />
                <span style={{
                  fontSize: '9px',
                  padding: '1px 4px',
                  background: isActive ? 'rgba(59,130,246,0.2)' : tokens.colors.glass.subtle,
                  borderRadius: tokens.radius.sm,
                  minWidth: 16,
                  textAlign: 'center',
                }}>
                  {tab.count}
                </span>
              </button>
            </AdaptiveTooltip>
          );
        })}
        <AdaptiveTooltip content="Close panel" placement="bottom">
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: tokens.colors.text.muted, cursor: 'pointer' }}
          >
            <X size={12} />
          </button>
        </AdaptiveTooltip>
      </div>

      {showToolbar && (
        <FilterToolbar
          filter={companionFilter}
          sizeMode={sizeMode}
          tagOptions={tagOptions}
          showQuickFilters={false}
          dense
        />
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: tokens.spacing.xs }}>
        {activeTab === COMPANION_TABS.VIEWS && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
            <div style={{ fontSize: '9px', color: tokens.colors.text.muted, padding: '2px 4px' }}>
              Drag to place on canvas
            </div>
            {filteredViews.map((view) => {
              const viewType = VIEW_TYPES[view.type] || VIEW_TYPES.image;
              const ViewIcon = viewType.icon;
              return (
                <div
                  key={view.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, 'view', view)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing.xs,
                    padding: tokens.spacing.xs,
                    background: tokens.colors.glass.subtle,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.sm,
                    borderLeft: `3px solid ${view.vgColor || viewType.color}`,
                    cursor: 'grab',
                    opacity: view.isPlaced ? 1 : 0.7,
                  }}
                >
                  <GripVertical size={10} style={{ color: tokens.colors.text.muted, flexShrink: 0 }} />
                  <ViewIcon size={12} style={{ color: viewType.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: tokens.fontSize.xs,
                        color: tokens.colors.text.primary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {view.name}
                    </div>
                    {view.vgName && (
                      <div
                        style={{
                          fontSize: '8px',
                          color: tokens.colors.text.muted,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {view.vgName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === COMPANION_TABS.DATASETS && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
            <div style={{ fontSize: '9px', color: tokens.colors.text.muted, padding: '2px 4px' }}>
              Drag to create new view
            </div>
            {filteredDatasets.map((ds) => (
              <div
                key={ds.id}
                draggable
                onDragStart={(e) => onDragStart(e, 'dataset', ds)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.xs,
                  padding: tokens.spacing.xs,
                  background: tokens.colors.glass.subtle,
                  border: `1px solid ${tokens.colors.border.subtle}`,
                  borderRadius: tokens.radius.sm,
                  cursor: 'grab',
                  opacity: ds.isLoaded ? 1 : 0.6,
                }}
              >
                <GripVertical size={10} style={{ color: tokens.colors.text.muted, flexShrink: 0 }} />
                <Database size={12} style={{ color: ds.isLoaded ? tokens.colors.accent.green : tokens.colors.text.muted, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: tokens.fontSize.xs,
                      color: tokens.colors.text.primary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ds.name}
                  </div>
                  <div style={{ fontSize: '8px', color: tokens.colors.text.muted }}>
                    {ds.type} - {ds.size}
                  </div>
                </div>
                {ds.isLoaded && <CheckCircle size={10} style={{ color: tokens.colors.accent.green, flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const VGBlock = ({ vg, cellSize, gap, isSelected, onClick, subtle = false }) => {
  const { position, color, name, isExplicit, views } = vg;
  const width = position.colSpan * cellSize + (position.colSpan - 1) * gap;
  const height = position.rowSpan * cellSize + (position.rowSpan - 1) * gap;
  const left = position.col * (cellSize + gap);
  const top = position.row * (cellSize + gap);

  // When subtle mode is on (showing both VG outlines and views), make outlines less prominent
  const bgOpacity = subtle ? '08' : '20';
  const borderOpacity = subtle ? '40' : '80';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        background: subtle ? 'transparent' : `${color}${bgOpacity}`,
        border: `${subtle ? 1 : 2}px ${isExplicit ? 'solid' : 'dashed'} ${color}${borderOpacity}`,
        borderRadius: tokens.radius.md,
        cursor: 'pointer',
        boxShadow: isSelected ? `0 0 16px ${color}50, inset 0 0 24px ${color}10` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        zIndex: isSelected ? 10 : (subtle ? 0 : 1),
        transition: 'box-shadow 0.15s ease, border 0.15s ease',
        pointerEvents: subtle ? 'none' : 'auto', // Let clicks pass through to views when subtle
      }}
    >
      <span
        style={{
          fontSize: cellSize > 35 ? tokens.fontSize.sm : tokens.fontSize.xs,
          fontWeight: 600,
          color: tokens.colors.text.primary,
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          textAlign: 'center',
          padding: '2px 4px',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
      {cellSize > 40 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
          <span style={{ fontSize: tokens.fontSize.xs, color, fontFamily: 'monospace', fontWeight: 600 }}>
            {formatCellRef(position.row, position.col)}
          </span>
          <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>
            {views?.length || 0}v
          </span>
        </div>
      )}
    </div>
  );
};

const ViewCell = ({ view, cellSize, gap, isSelected, onClick }) => {
  const viewType = VIEW_TYPES[view.type] || VIEW_TYPES.image;
  const ViewIcon = viewType.icon;
  const left = view.canvasCol * (cellSize + gap);
  const top = view.canvasRow * (cellSize + gap);
  const width = (view.colSpan || 1) * cellSize + ((view.colSpan || 1) - 1) * gap;
  const height = (view.rowSpan || 1) * cellSize + ((view.rowSpan || 1) - 1) * gap;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        background: `${viewType.color}20`,
        border: `1px solid ${viewType.color}60`,
        borderRadius: tokens.radius.sm,
        cursor: 'pointer',
        boxShadow: isSelected ? `0 0 8px ${viewType.color}50` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        zIndex: isSelected ? 10 : 1,
      }}
    >
      <ViewIcon size={Math.min(16, cellSize * 0.4)} style={{ color: viewType.color }} />
      {cellSize > 40 && (
        <span
          style={{
            fontSize: '8px',
            color: tokens.colors.text.secondary,
            textAlign: 'center',
            maxWidth: '100%',
            padding: '0 2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {view.name}
        </span>
      )}
    </div>
  );
};

const ViewportIndicator = ({ viewport, cellSize, gap, isDragging, onMouseDown }) => {
  const { position, size, name, isPrimary } = viewport;
  const width = size.cols * cellSize + (size.cols - 1) * gap;
  const height = size.rows * cellSize + (size.rows - 1) * gap;
  const left = position.col * (cellSize + gap);
  const top = position.row * (cellSize + gap);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        border: `2px solid ${tokens.colors.accent.cyan}`,
        borderRadius: tokens.radius.md,
        background: `${tokens.colors.accent.cyan}08`,
        boxShadow: `0 0 12px ${tokens.colors.accent.cyan}30`,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 50,
      }}
    >
      <span
        style={{
          position: 'absolute',
          bottom: 4,
          left: 6,
          fontSize: tokens.fontSize.xs,
          fontWeight: 600,
          color: tokens.colors.accent.cyan,
          background: `${tokens.colors.bg.primary}dd`,
          padding: '1px 6px',
          borderRadius: tokens.radius.sm,
          textTransform: 'uppercase',
        }}
      >
        {name}
      </span>
      {isPrimary && (
        <div
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 12,
            height: 12,
            background: tokens.colors.accent.amber,
            borderRadius: '50%',
            border: `2px solid ${tokens.colors.bg.primary}`,
            boxShadow: `0 0 6px ${tokens.colors.accent.amber}`,
          }}
        />
      )}
      <div style={{ position: 'absolute', top: 4, right: 6, color: tokens.colors.accent.cyan, opacity: 0.7 }}>
        <Move size={10} />
      </div>
    </div>
  );
};

const CollaboratorIndicators = ({ collaborators, cellSize, gap, showCursors }) => (
  <>
    {collaborators.filter((c) => c.isOnline && c.viewportPos).map((collab) => {
      const vpLeft = collab.viewportPos.col * (cellSize + gap);
      const vpTop = collab.viewportPos.row * (cellSize + gap);

      return (
        <React.Fragment key={collab.id}>
          <div
            style={{
              position: 'absolute',
              left: vpLeft,
              top: vpTop,
              width: cellSize * 3 + gap * 2,
              height: cellSize * 3 + gap * 2,
              border: `2px dashed ${collab.color}50`,
              borderRadius: tokens.radius.md,
              pointerEvents: 'none',
              zIndex: 45,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: vpLeft + cellSize * 3 + gap * 2 - 10,
              top: vpTop - 10,
              width: 20,
              height: 20,
              background: collab.color,
              borderRadius: '50%',
              border: `2px solid ${tokens.colors.bg.primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              fontWeight: 700,
              color: 'white',
              zIndex: 60,
              boxShadow: collab.isBroadcasting
                ? `0 0 8px ${collab.color}, 0 0 16px ${collab.color}`
                : `0 0 6px ${collab.color}`,
            }}
            title={collab.name}
          >
            {collab.avatar}
            {collab.isBroadcasting && (
              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  background: tokens.colors.accent.red,
                  borderRadius: '50%',
                  border: `1px solid ${tokens.colors.bg.primary}`,
                }}
              />
            )}
          </div>
          {showCursors && collab.cursorPos && (
            <div
              style={{
                position: 'absolute',
                left: collab.cursorPos.col * (cellSize + gap) - 4,
                top: collab.cursorPos.row * (cellSize + gap) - 4,
                color: collab.color,
                zIndex: 65,
                pointerEvents: 'none',
                filter: `drop-shadow(0 0 4px ${collab.color})`,
              }}
            >
              <MousePointer2 size={12} style={{ color: collab.color }} />
            </div>
          )}
        </React.Fragment>
      );
    })}
  </>
);

const LinkLines = ({ links, viewGroups, cellSize, gap, highlightedId, onLinkClick }) => {
  const getCenter = (vgId) => {
    const vg = viewGroups.find((v) => v.id === vgId);
    if (!vg?.position) return null;
    return {
      x: vg.position.col * (cellSize + gap) + (vg.position.colSpan * cellSize + (vg.position.colSpan - 1) * gap) / 2,
      y: vg.position.row * (cellSize + gap) + (vg.position.rowSpan * cellSize + (vg.position.rowSpan - 1) * gap) / 2,
    };
  };

  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {links.map((link) => {
        const from = getCenter(link.from);
        const to = getCenter(link.to);
        if (!from || !to) return null;
        const isHighlighted = highlightedId === link.id;
        const color = link.type === 'camera' ? tokens.colors.accent.cyan : tokens.colors.accent.purple;
        return (
          <g
            key={link.id}
            onClick={() => onLinkClick(link.id)}
            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          >
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={isHighlighted ? 4 : 2}
              strokeOpacity={isHighlighted ? 1 : 0.6}
              strokeDasharray={link.mode === 'unidirectional' ? '6,4' : 'none'}
            />
            {link.mode === 'bidirectional' && (
              <>
                <circle cx={from.x} cy={from.y} r={4} fill={color} opacity={0.8} />
                <circle cx={to.x} cy={to.y} r={4} fill={color} opacity={0.8} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const ModeTabs = ({ activeMode, onModeChange, sizeMode }) => {
  const isCompact = sizeMode === 'compact';
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${tokens.colors.border.subtle}`, background: tokens.colors.bg.secondary }}>
      {Object.entries(MODE_CONFIG).map(([mode, config]) => {
        const isActive = activeMode === mode;
        const ModeIcon = config.icon;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spacing.xs,
              padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
              background: isActive ? tokens.colors.glass.medium : 'transparent',
              border: 'none',
              borderBottom: `2px solid ${isActive ? config.color : 'transparent'}`,
              color: isActive ? config.color : tokens.colors.text.muted,
              cursor: 'pointer',
              fontSize: tokens.fontSize.sm,
              fontWeight: isActive ? 600 : 400,
            }}
          >
            <ModeIcon size={14} />
            {!isCompact && <span>{config.label}</span>}
          </button>
        );
      })}
    </div>
  );
};

const ModeTabsPill = ({ activeMode, onModeChange }) => (
  <div style={{ display: 'flex', gap: tokens.spacing.md, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
    {Object.entries(MODE_CONFIG).map(([mode, config]) => {
      const isActive = activeMode === mode;
      const ModeIcon = config.icon;
      return (
        <button
          key={mode}
          type="button"
          onClick={() => onModeChange(mode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.xs,
            padding: '6px 8px',
            borderRadius: tokens.radius.sm,
            border: 'none',
            borderBottom: `2px solid ${isActive ? config.color : 'transparent'}`,
            background: 'transparent',
            color: isActive ? config.color : tokens.colors.text.muted,
            cursor: 'pointer',
            fontSize: tokens.fontSize.xs,
            fontWeight: isActive ? 600 : 500,
          }}
        >
          <ModeIcon size={12} />
          <span>{config.label}</span>
        </button>
      );
    })}
  </div>
);

const LayoutSearchRow = ({ filter, tagOptions = [] }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const tagCount = filter.selectedTags.length;
  const quickCount = filter.quickFilters.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, flexWrap: 'nowrap' }}>
        <SearchInput
          value={filter.searchQuery}
          onChange={filter.setSearchQuery}
          onClear={() => filter.setSearchQuery('')}
          size="small"
          style={{ flex: 1, minWidth: 140, background: tokens.colors.bg.secondary }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'filters' ? null : 'filters')}
            title="Filters"
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.sm,
              border: `1px solid ${quickCount ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
              background: quickCount ? tokens.colors.glass.medium : tokens.colors.bg.secondary,
              color: quickCount ? tokens.colors.accent.blue : tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Filter size={12} />
          </button>
          {activeDropdown === 'filters' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                zIndex: 1000,
                width: 180,
                background: tokens.colors.bg.primary,
                border: `1px solid ${tokens.colors.border.default}`,
                borderRadius: tokens.radius.lg,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                padding: tokens.spacing.xs,
              }}
            >
              {QUICK_FILTERS.map((qf) => {
                const isActive = filter.quickFilters.includes(qf.id);
                const QfIcon = qf.icon;
                return (
                  <button
                    key={qf.id}
                    type="button"
                    onClick={() => filter.toggleQuickFilter(qf.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '6px 8px',
                      background: isActive ? tokens.colors.glass.medium : 'transparent',
                      border: 'none',
                      borderRadius: tokens.radius.md,
                      color: isActive ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <QfIcon size={12} />
                    <span style={{ flex: 1 }}>{qf.label}</span>
                    {isActive && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'tags' ? null : 'tags')}
            title="Tags"
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.sm,
              border: `1px solid ${tagCount ? tokens.colors.accent.cyan : tokens.colors.border.subtle}`,
              background: tagCount ? tokens.colors.glass.medium : tokens.colors.bg.secondary,
              color: tagCount ? tokens.colors.accent.cyan : tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Tag size={12} />
          </button>
          {activeDropdown === 'tags' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                zIndex: 1000,
                width: 200,
                background: tokens.colors.bg.primary,
                border: `1px solid ${tokens.colors.border.default}`,
                borderRadius: tokens.radius.lg,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                padding: tokens.spacing.sm,
                display: 'flex',
                flexWrap: 'wrap',
                gap: tokens.spacing.xs,
              }}
            >
              {tagOptions.map((tag) => {
                const isActive = filter.selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => filter.toggleTag(tag)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: tokens.radius.lg,
                      border: `1px solid ${isActive ? tokens.colors.accent.cyan : tokens.colors.border.subtle}`,
                      background: isActive ? tokens.colors.glass.strong : tokens.colors.glass.subtle,
                      color: isActive ? tokens.colors.accent.cyan : tokens.colors.text.secondary,
                      fontSize: tokens.fontSize.xs,
                      cursor: 'pointer',
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
            title="Sort"
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.sm,
              border: `1px solid ${tokens.colors.border.subtle}`,
              background: tokens.colors.bg.secondary,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <ArrowUpDown size={12} />
          </button>
          {activeDropdown === 'sort' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                zIndex: 1000,
                width: 180,
                background: tokens.colors.bg.primary,
                border: `1px solid ${tokens.colors.border.default}`,
                borderRadius: tokens.radius.lg,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                padding: tokens.spacing.xs,
              }}
            >
              {SORT_OPTIONS.map((opt) => {
                const isActive = filter.sortBy === opt.value;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      filter.setSortBy(opt.value);
                      setActiveDropdown(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '6px 8px',
                      background: isActive ? tokens.colors.glass.medium : 'transparent',
                      border: 'none',
                      borderRadius: tokens.radius.md,
                      color: isActive ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <OptIcon size={12} />
                    <span style={{ flex: 1 }}>{opt.label}</span>
                    {isActive && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs, flexWrap: 'wrap' }}>
        <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, flexShrink: 0 }}>Quick:</span>
        {QUICK_FILTERS.map((qf) => {
          const isActive = filter.quickFilters.includes(qf.id);
          const QfIcon = qf.icon;
          return (
            <button
              key={qf.id}
              type="button"
              onClick={() => filter.toggleQuickFilter(qf.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: tokens.radius.lg,
                border: `1px solid ${isActive ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
                background: isActive ? tokens.colors.glass.medium : tokens.colors.bg.secondary,
                color: isActive ? tokens.colors.accent.blue : tokens.colors.text.muted,
                cursor: 'pointer',
                fontSize: tokens.fontSize.xs,
              }}
            >
              <QfIcon size={10} />
              <span>{qf.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const LayoutControlDeck = ({
  minimapZoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  companionOpen,
  toggleCompanion,
  currentPositionLabel,
  isAtHome,
  canvasSizeLabel,
  openViewportCount,
  onMove,
  onGoHome,
  onSetHome,
  onFitAll,
  onAddBookmark,
  sizeMode,
  deckWidth,
}) => {
  const dpadSize = sizeMode === 'minimal' ? 76 : sizeMode === 'compact' ? 88 : 100;
  const leftWidth = deckWidth ?? dpadSize + 24;
  const actions = [
    { icon: Home, title: 'Go Home', onClick: onGoHome },
    { icon: Crosshair, title: 'Set Home', onClick: onSetHome },
    { icon: Scan, title: 'Fit All', onClick: onFitAll },
    { icon: Star, title: 'Bookmark', onClick: onAddBookmark },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.sm,
        padding: tokens.spacing.sm,
        background: tokens.colors.bg.tertiary,
        borderRight: `1px solid ${tokens.colors.border.subtle}`,
        width: leftWidth,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
        <div
          style={{
            fontSize: tokens.fontSize.xs,
            color: tokens.colors.text.muted,
            textAlign: 'center',
            width: '100%',
          }}
        >
          Zoom
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.spacing.xs,
            width: '100%',
            background: tokens.colors.bg.secondary,
            borderRadius: tokens.radius.lg,
            border: `1px solid ${tokens.colors.border.subtle}`,
            padding: tokens.spacing.xs,
          }}
        >
          <button
            type="button"
            onClick={onZoomOut}
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Minus size={10} />
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            style={{
              flex: 1,
              minWidth: 0,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
              fontSize: tokens.fontSize.xs,
            }}
          >
            {minimapZoom}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Plus size={10} />
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          background: tokens.colors.bg.secondary,
          borderRadius: tokens.radius.lg,
          border: `1px solid ${tokens.colors.border.subtle}`,
          padding: tokens.spacing.xs,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          minHeight: dpadSize + 6,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: tokens.spacing.sm,
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.colors.border.subtle}`,
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacing.xs }}>
          <SquareDPad
            sizeMode={sizeMode}
            onMove={onMove}
            onGoHome={onGoHome}
            centerLabel={currentPositionLabel}
            isAtHome={isAtHome}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: tokens.spacing.xs,
          background: tokens.colors.bg.secondary,
          borderRadius: tokens.radius.lg,
          border: `1px solid ${tokens.colors.border.subtle}`,
          padding: tokens.spacing.xs,
        }}
      >
        {actions.map((action, idx) => {
          const ActionIcon = action.icon;
          return (
            <button
              key={`${action.title}-${idx}`}
              type="button"
              onClick={action.onClick}
              title={action.title}
              style={{
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: tokens.radius.md,
                border: `1px solid ${tokens.colors.border.subtle}`,
                background: 'transparent',
                color: tokens.colors.text.muted,
                cursor: 'pointer',
              }}
            >
              <ActionIcon size={14} />
            </button>
          );
        })}
      </div>

    </div>
  );
};

const MapToolbar = ({
  displayMode,
  setDisplayMode,
  showViewports,
  toggleViewports,
  showCollaborators,
  toggleCollaborators,
  minimapZoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  companionOpen,
  toggleCompanion,
  sizeMode,
}) => {
  const isCompact = sizeMode === 'compact';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: tokens.spacing.md,
        padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
        background: tokens.colors.bg.tertiary,
        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          background: tokens.colors.bg.secondary,
          borderRadius: tokens.radius.md,
          padding: '2px',
          border: `1px solid ${tokens.colors.border.subtle}`,
        }}
      >
        {[
          { mode: DISPLAY_MODES.VG, label: 'VG', icon: Grid3X3 },
          { mode: DISPLAY_MODES.VIEW, label: 'View', icon: Layers },
        ].map(({ mode, label, icon: DisplayIcon }) => {
          const isActive = displayMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setDisplayMode(mode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: isActive ? tokens.colors.glass.medium : 'transparent',
                border: 'none',
                borderRadius: tokens.radius.sm,
                color: isActive ? tokens.colors.accent.blue : tokens.colors.text.muted,
                cursor: 'pointer',
                fontSize: tokens.fontSize.sm,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <DisplayIcon size={12} />
              {!isCompact && <span>{label}</span>}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        {[
          { active: showViewports, toggle: toggleViewports, icon: Scan, label: 'Viewport' },
          { active: showCollaborators, toggle: toggleCollaborators, icon: Users, label: 'Team' },
        ].map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={item.toggle}
            title={item.label}
            style={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: item.active ? tokens.colors.glass.medium : 'transparent',
              border: `1px solid ${item.active ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: item.active ? tokens.colors.accent.blue : tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <item.icon size={12} />
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            onClick={onZoomOut}
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Minus size={10} />
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            style={{
              minWidth: 36,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
              fontSize: tokens.fontSize.xs,
            }}
          >
            {minimapZoom}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Plus size={10} />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleCompanion}
          title={companionOpen ? 'Hide panel' : 'Show Views and Datasets'}
          style={{
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: companionOpen ? tokens.colors.glass.medium : 'transparent',
            border: `1px solid ${companionOpen ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
            borderRadius: tokens.radius.sm,
            color: companionOpen ? tokens.colors.accent.blue : tokens.colors.text.muted,
            cursor: 'pointer',
          }}
        >
          {companionOpen ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.xs,
          background: tokens.colors.bg.secondary,
          borderRadius: tokens.radius.lg,
          border: `1px solid ${tokens.colors.border.subtle}`,
          padding: tokens.spacing.xs,
        }}
      >
        <div style={{ display: 'flex', gap: tokens.spacing.xs, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: tokens.radius.md,
              background: tokens.colors.glass.subtle,
              border: `1px solid ${tokens.colors.border.subtle}`,
              color: tokens.colors.text.muted,
              fontSize: tokens.fontSize.xs,
              fontWeight: 600,
            }}
          >
            Canvas {canvasSizeLabel}
          </span>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: tokens.radius.md,
              background: tokens.colors.glass.subtle,
              border: `1px solid ${tokens.colors.border.subtle}`,
              color: tokens.colors.text.muted,
              fontSize: tokens.fontSize.xs,
              fontWeight: 600,
            }}
          >
            {openViewportCount} Viewports
          </span>
        </div>
      </div>
    </div>
  );
};

const ContextualPanelContent = ({
  mode,
  viewport,
  setViewport,
  homePosition,
  viewGroups,
  selectedVGId,
  setSelectedVGId,
  links,
  highlightedLinkId,
  setHighlightedLinkId,
  collaborators,
  showCursors,
  setShowCursors,
  bookmarks,
  filter,
  sizeMode,
  showToolbar = true,
  // Subtab props
  linksSubTab,
  setLinksSubTab,
  teamSubTab,
  setTeamSubTab,
  // Me tab props
  isBroadcasting,
  setIsBroadcasting,
  cursorVisible,
  setCursorVisible,
  cursorColor,
  setCursorColor,
}) => {
  const handleMove = (dir) => {
    setViewport((prev) => ({
      ...prev,
      position: {
        row: Math.max(0, Math.min(CANVAS.rows - prev.size.rows, prev.position.row + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0))),
        col: Math.max(0, Math.min(CANVAS.cols - prev.size.cols, prev.position.col + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0))),
      },
    }));
  };

  const filteredVGs = filter.applyFilters(viewGroups);
  const activeVGs = filteredVGs.filter((vg) => vg.position);
  const availableTags = useMemo(
    () => Array.from(new Set(viewGroups.flatMap((vg) => vg.tags || []))),
    [viewGroups]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {showToolbar && <FilterToolbar filter={filter} sizeMode={sizeMode} tagOptions={availableTags} />}

      <div style={{ flex: 1, overflow: 'auto', padding: showToolbar ? tokens.spacing.md : tokens.spacing.sm }}>
        {mode === MAP_MODES.NAVIGATE && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.lg, marginBottom: tokens.spacing.lg }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted, marginBottom: '2px' }}>Current Position</div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: tokens.colors.accent.amber,
                  }}
                >
                  {formatCellRef(viewport.position.row, viewport.position.col)}
                </div>
                <div style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, marginTop: '2px' }}>
                  Viewport: {viewport.size.cols}x{viewport.size.rows}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: tokens.spacing.lg }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.sm }}>
                <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>Viewports</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
                  <button
                    type="button"
                    style={{
                      padding: '2px 8px',
                      background: tokens.colors.glass.subtle,
                      border: 'none',
                      borderRadius: tokens.radius.md,
                      color: tokens.colors.accent.cyan,
                      cursor: 'pointer',
                      fontSize: tokens.fontSize.xs,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={10} /> New
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '2px 8px',
                      background: tokens.colors.glass.subtle,
                      border: 'none',
                      borderRadius: tokens.radius.md,
                      color: tokens.colors.accent.blue,
                      cursor: 'pointer',
                      fontSize: tokens.fontSize.xs,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle size={10} /> Save
                  </button>
                </div>
              </div>
              {MOCK_VIEWPORTS.map((vp) => {
                const isActive = vp.id === viewport.id;
                return (
                  <div
                    key={vp.id}
                    onClick={() => setViewport(vp)}
                    role="button"
                    tabIndex={0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.sm,
                      padding: tokens.spacing.sm,
                      marginBottom: tokens.spacing.xs,
                      background: isActive ? tokens.colors.glass.medium : tokens.colors.glass.subtle,
                      border: `1px solid ${isActive ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
                      borderRadius: tokens.radius.md,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? tokens.colors.accent.blue : tokens.colors.text.muted }} />
                    <span style={{ flex: 1, fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{vp.name}</span>
                    <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>{vp.size.cols}x{vp.size.rows}</span>
                  </div>
                );
              })}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.sm }}>
                <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>Bookmarks</span>
                <button
                  type="button"
                  style={{
                    padding: '2px 8px',
                    background: tokens.colors.glass.subtle,
                    border: 'none',
                    borderRadius: tokens.radius.md,
                    color: tokens.colors.accent.cyan,
                    cursor: 'pointer',
                    fontSize: tokens.fontSize.xs,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={10} /> Add
                </button>
              </div>
              {filter.applyFilters(bookmarks).map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => setViewport((p) => ({ ...p, position: bm.position }))}
                  role="button"
                  tabIndex={0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing.sm,
                    padding: tokens.spacing.sm,
                    marginBottom: tokens.spacing.xs,
                    background: tokens.colors.glass.subtle,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.md,
                    cursor: 'pointer',
                  }}
                >
                  {bm.isStarred ? (
                    <Star size={12} fill={tokens.colors.accent.amber} style={{ color: tokens.colors.accent.amber }} />
                  ) : (
                    <Bookmark size={12} style={{ color: tokens.colors.text.muted }} />
                  )}
                  <span style={{ flex: 1, fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{bm.name}</span>
                  <span
                    style={{
                      fontSize: tokens.fontSize.xs,
                      color: tokens.colors.accent.amber,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  >
                    {formatCellRef(bm.position.row, bm.position.col)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {mode === MAP_MODES.LAYOUT && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.sm }}>
              <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>On Canvas</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
                <button
                  type="button"
                  style={{
                    padding: '2px 8px',
                    background: tokens.colors.glass.subtle,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.md,
                    color: tokens.colors.text.secondary,
                    cursor: 'pointer',
                    fontSize: tokens.fontSize.xs,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Scan size={10} /> Fit All
                </button>
                <span
                  style={{
                    fontSize: tokens.fontSize.xs,
                    color: tokens.colors.text.muted,
                    background: tokens.colors.glass.medium,
                    padding: '2px 8px',
                    borderRadius: tokens.radius.lg,
                  }}
                >
                  {activeVGs.length}
                </span>
              </div>
            </div>
            {activeVGs.map((vg) => (
              <div
                key={vg.id}
                onClick={() => setSelectedVGId(vg.id)}
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                  padding: tokens.spacing.sm,
                  marginBottom: tokens.spacing.xs,
                  background: selectedVGId === vg.id ? tokens.colors.glass.medium : tokens.colors.glass.subtle,
                  border: `1px solid ${selectedVGId === vg.id ? vg.color : tokens.colors.border.subtle}`,
                  borderRadius: tokens.radius.md,
                  borderLeft: `3px solid ${vg.color}`,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: tokens.fontSize.sm,
                    color: tokens.colors.text.primary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {vg.name}
                </span>
                <span style={{ fontSize: tokens.fontSize.xs, color: vg.color, fontFamily: 'monospace', fontWeight: 600 }}>
                  {formatCellRef(vg.position.row, vg.position.col)}
                </span>
                <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>{vg.views?.length || 0}v</span>
              </div>
            ))}
          </>
        )}

        {mode === MAP_MODES.LINKS && (
          <>
            {/* Subtabs */}
            <div
              style={{
                display: 'flex',
                gap: tokens.spacing.xs,
                marginBottom: tokens.spacing.md,
                padding: tokens.spacing.xs,
                background: tokens.colors.glass.subtle,
                borderRadius: tokens.radius.md,
              }}
            >
              {[
                { id: 'vg', label: 'VG Links', icon: Layers },
                { id: 'view', label: 'View Links', icon: Link2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLinksSubTab(tab.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: tokens.spacing.xs,
                    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                    background: linksSubTab === tab.id ? tokens.colors.accent.purple + '20' : 'transparent',
                    border: linksSubTab === tab.id ? `1px solid ${tokens.colors.accent.purple}40` : '1px solid transparent',
                    borderRadius: tokens.radius.sm,
                    color: linksSubTab === tab.id ? tokens.colors.accent.purple : tokens.colors.text.muted,
                    cursor: 'pointer',
                    fontSize: tokens.fontSize.sm,
                    fontWeight: linksSubTab === tab.id ? 600 : 400,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* VG Links subtab */}
            {linksSubTab === 'vg' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.sm }}>
                  <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>
                    ViewGroup Links ({links.length})
                  </span>
                  <button
                    type="button"
                    style={{
                      padding: '2px 8px',
                      background: tokens.colors.glass.subtle,
                      border: 'none',
                      borderRadius: tokens.radius.md,
                      color: tokens.colors.accent.purple,
                      cursor: 'pointer',
                      fontSize: tokens.fontSize.xs,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={10} /> Create
                  </button>
                </div>
                {links.map((link) => {
                  const fromVG = viewGroups.find((v) => v.id === link.from);
                  const toVG = viewGroups.find((v) => v.id === link.to);
                  const isHighlighted = highlightedLinkId === link.id;
                  const color = link.type === 'camera' ? tokens.colors.accent.cyan : tokens.colors.accent.purple;
                  return (
                    <div
                      key={link.id}
                      onClick={() => setHighlightedLinkId(isHighlighted ? null : link.id)}
                      role="button"
                      tabIndex={0}
                      style={{
                        padding: tokens.spacing.sm,
                        marginBottom: tokens.spacing.xs,
                        background: isHighlighted ? tokens.colors.glass.medium : tokens.colors.glass.subtle,
                        border: `1px solid ${isHighlighted ? color : tokens.colors.border.subtle}`,
                        borderRadius: tokens.radius.md,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: '4px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: fromVG?.color }} />
                        <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{fromVG?.name}</span>
                        <span style={{ color }}>{link.mode === 'bidirectional' ? '↔' : '→'}</span>
                        <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{toVG?.name}</span>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: toVG?.color }} />
                      </div>
                      <span
                        style={{
                          fontSize: tokens.fontSize.xs,
                          padding: '2px 6px',
                          background: `${color}20`,
                          color,
                          borderRadius: tokens.radius.sm,
                        }}
                      >
                        {link.type}
                      </span>
                    </div>
                  );
                })}
              </>
            )}

            {/* View Links subtab */}
            {linksSubTab === 'view' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.sm }}>
                  <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>
                    View Links
                  </span>
                  <button
                    type="button"
                    style={{
                      padding: '2px 8px',
                      background: tokens.colors.glass.subtle,
                      border: 'none',
                      borderRadius: tokens.radius.md,
                      color: tokens.colors.accent.purple,
                      cursor: 'pointer',
                      fontSize: tokens.fontSize.xs,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={10} /> Create
                  </button>
                </div>
                {/* View links - sync camera, window/level, crosshairs between individual views */}
                <div
                  style={{
                    padding: tokens.spacing.sm,
                    background: tokens.colors.glass.subtle,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.md,
                    marginBottom: tokens.spacing.xs,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: tokens.fontSize.xs,
                        padding: '2px 6px',
                        background: `${tokens.colors.accent.cyan}20`,
                        color: tokens.colors.accent.cyan,
                        borderRadius: tokens.radius.sm,
                      }}
                    >
                      Camera Sync
                    </span>
                  </div>
                  <div style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.secondary }}>
                    Volume A ↔ Volume B ↔ Slice C
                  </div>
                </div>
                <div
                  style={{
                    padding: tokens.spacing.sm,
                    background: tokens.colors.glass.subtle,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.md,
                    marginBottom: tokens.spacing.xs,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: tokens.fontSize.xs,
                        padding: '2px 6px',
                        background: `${tokens.colors.accent.amber}20`,
                        color: tokens.colors.accent.amber,
                        borderRadius: tokens.radius.sm,
                      }}
                    >
                      Window/Level
                    </span>
                  </div>
                  <div style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.secondary }}>
                    Slice A ↔ Slice B
                  </div>
                </div>
                <div
                  style={{
                    padding: tokens.spacing.sm,
                    background: tokens.colors.glass.subtle,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.md,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: tokens.fontSize.xs,
                        padding: '2px 6px',
                        background: `${tokens.colors.accent.green}20`,
                        color: tokens.colors.accent.green,
                        borderRadius: tokens.radius.sm,
                      }}
                    >
                      Crosshairs
                    </span>
                  </div>
                  <div style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.secondary }}>
                    MPR Axial ↔ MPR Sagittal ↔ MPR Coronal
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {mode === MAP_MODES.TEAM && (
          <>
            {/* Subtabs */}
            <div
              style={{
                display: 'flex',
                gap: tokens.spacing.xs,
                marginBottom: tokens.spacing.md,
                padding: tokens.spacing.xs,
                background: tokens.colors.glass.subtle,
                borderRadius: tokens.radius.md,
              }}
            >
              {[
                { id: 'me', label: 'Me', icon: MousePointer2 },
                { id: 'team', label: 'Team', icon: Users },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTeamSubTab(tab.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: tokens.spacing.xs,
                    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                    background: teamSubTab === tab.id ? tokens.colors.accent.amber + '20' : 'transparent',
                    border: teamSubTab === tab.id ? `1px solid ${tokens.colors.accent.amber}40` : '1px solid transparent',
                    borderRadius: tokens.radius.sm,
                    color: teamSubTab === tab.id ? tokens.colors.accent.amber : tokens.colors.text.muted,
                    cursor: 'pointer',
                    fontSize: tokens.fontSize.sm,
                    fontWeight: teamSubTab === tab.id ? 600 : 400,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Me subtab */}
            {teamSubTab === 'me' && (
              <>
                {/* My Viewports */}
                <div style={{ marginBottom: tokens.spacing.lg }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.sm }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                      <Scan size={12} style={{ color: tokens.colors.accent.teal }} />
                      <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>My Viewports</span>
                    </div>
                    <button
                      type="button"
                      style={{
                        padding: '2px 8px',
                        background: tokens.colors.glass.subtle,
                        border: 'none',
                        borderRadius: tokens.radius.md,
                        color: tokens.colors.accent.teal,
                        cursor: 'pointer',
                        fontSize: tokens.fontSize.xs,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={10} /> New
                    </button>
                  </div>
                  <div
                    style={{
                      padding: tokens.spacing.sm,
                      background: tokens.colors.glass.medium,
                      border: `1px solid ${tokens.colors.accent.teal}40`,
                      borderRadius: tokens.radius.md,
                      marginBottom: tokens.spacing.xs,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>Main Viewport</span>
                      <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.accent.amber, fontFamily: 'monospace' }}>
                        {formatCellRef(viewport.position.row, viewport.position.col)}
                      </span>
                    </div>
                    <div style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, marginTop: '2px' }}>
                      {viewport.size.cols}×{viewport.size.rows} cells
                    </div>
                  </div>
                </div>

                {/* Broadcast */}
                <div style={{ marginBottom: tokens.spacing.lg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm }}>
                    <Radio size={12} style={{ color: tokens.colors.accent.red }} />
                    <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>Broadcast</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: tokens.spacing.sm,
                      background: isBroadcasting ? `${tokens.colors.accent.red}15` : tokens.colors.glass.subtle,
                      border: `1px solid ${isBroadcasting ? tokens.colors.accent.red + '40' : tokens.colors.border.subtle}`,
                      borderRadius: tokens.radius.md,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>
                        {isBroadcasting ? 'Broadcasting to team' : 'Not broadcasting'}
                      </div>
                      {isBroadcasting && (
                        <div style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.accent.red, marginTop: '2px' }}>
                          Team can follow your viewport
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBroadcasting(!isBroadcasting)}
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        background: isBroadcasting ? tokens.colors.accent.red : tokens.colors.bg.tertiary,
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: isBroadcasting ? 20 : 2,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: 'white',
                          transition: 'left 0.2s',
                        }}
                      />
                    </button>
                  </div>
                </div>

                {/* My Cursor */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm }}>
                    <MousePointer2 size={12} style={{ color: tokens.colors.accent.cyan }} />
                    <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>My Cursor</span>
                  </div>
                  <div
                    style={{
                      padding: tokens.spacing.sm,
                      background: tokens.colors.glass.subtle,
                      border: `1px solid ${tokens.colors.border.subtle}`,
                      borderRadius: tokens.radius.md,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.sm }}>
                      <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>Visible to team</span>
                      <button
                        type="button"
                        onClick={() => setCursorVisible(!cursorVisible)}
                        style={{
                          width: 40,
                          height: 22,
                          borderRadius: 11,
                          background: cursorVisible ? tokens.colors.accent.cyan : tokens.colors.bg.tertiary,
                          border: 'none',
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: cursorVisible ? 20 : 2,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'white',
                            transition: 'left 0.2s',
                          }}
                        />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                      <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted }}>Color:</span>
                      {[
                        tokens.colors.accent.cyan,
                        tokens.colors.accent.green,
                        tokens.colors.accent.pink,
                        tokens.colors.accent.amber,
                        tokens.colors.accent.purple,
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCursorColor(color)}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: color,
                            border: cursorColor === color ? '2px solid white' : '2px solid transparent',
                            cursor: 'pointer',
                            boxShadow: cursorColor === color ? `0 0 0 2px ${color}` : 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Team subtab */}
            {teamSubTab === 'team' && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: tokens.spacing.sm,
                    marginBottom: tokens.spacing.md,
                    background: tokens.colors.glass.subtle,
                    borderRadius: tokens.radius.md,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                    <MousePointer2 size={14} style={{ color: tokens.colors.text.muted }} />
                    <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>Show all cursors</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCursors(!showCursors)}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      background: showCursors ? tokens.colors.accent.green : tokens.colors.bg.tertiary,
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: showCursors ? 20 : 2,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'white',
                        transition: 'left 0.2s',
                      }}
                    />
                  </button>
                </div>

                <div style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary, marginBottom: tokens.spacing.sm }}>
                  Online ({collaborators.filter((c) => c.isOnline).length})
                </div>
                {collaborators
                  .filter((c) => c.isOnline)
                  .map((collab) => (
                    <div
                      key={collab.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing.sm,
                        padding: tokens.spacing.sm,
                        marginBottom: tokens.spacing.xs,
                        background: tokens.colors.glass.subtle,
                        border: `1px solid ${tokens.colors.border.subtle}`,
                        borderRadius: tokens.radius.md,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: collab.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'white',
                        }}
                      >
                        {collab.avatar}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{collab.name}</div>
                        {collab.isBroadcasting && (
                          <div
                            style={{
                              fontSize: tokens.fontSize.xs,
                              color: tokens.colors.accent.red,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Radio size={10} /> Broadcasting
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        style={{
                          padding: '4px 8px',
                          background: tokens.colors.glass.medium,
                          border: 'none',
                          borderRadius: tokens.radius.sm,
                          color: tokens.colors.accent.blue,
                          cursor: 'pointer',
                          fontSize: tokens.fontSize.xs,
                        }}
                      >
                        Follow
                      </button>
                    </div>
                  ))}

                {collaborators.filter((c) => !c.isOnline).length > 0 && (
                  <>
                    <div
                      style={{
                        fontSize: tokens.fontSize.sm,
                        fontWeight: 600,
                        color: tokens.colors.text.muted,
                        marginTop: tokens.spacing.md,
                        marginBottom: tokens.spacing.sm,
                      }}
                    >
                      Offline ({collaborators.filter((c) => !c.isOnline).length})
                    </div>
                    {collaborators
                      .filter((c) => !c.isOnline)
                      .map((collab) => (
                        <div
                          key={collab.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: tokens.spacing.sm,
                            padding: tokens.spacing.sm,
                            marginBottom: tokens.spacing.xs,
                            background: tokens.colors.glass.subtle,
                            border: `1px solid ${tokens.colors.border.subtle}`,
                            borderRadius: tokens.radius.md,
                            opacity: 0.5,
                          }}
                        >
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: collab.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'white',
                            }}
                          >
                            {collab.avatar}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{collab.name}</div>
                            <div style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>Last seen 2h ago</div>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const CanvasMapV2Spec = ({ width = 480, height = 650, onClose, showDebugControls = false }) => {
  const [mapMode, setMapMode] = useState(MAP_MODES.LAYOUT);
  const [showVGOutlines, setShowVGOutlines] = useState(true); // Show ViewGroup outlines
  const [showViews, setShowViews] = useState(false); // Show individual views within VGs
  const [selectedVGId, setSelectedVGId] = useState('vg-1');
  const [highlightedLinkId, setHighlightedLinkId] = useState(null);
  const [showGridLabels] = useState(true);
  const showGridPaper = true;
  const [showViewports, setShowViewports] = useState(true);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showCursors, setShowCursors] = useState(true);
  const [linksSubTab, setLinksSubTab] = useState('vg'); // 'vg' | 'view'
  const [teamSubTab, setTeamSubTab] = useState('me'); // 'me' | 'team'
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [cursorColor, setCursorColor] = useState('#22d3ee');
  const [lockLabels] = useState(true);
  const [minimapZoom, setMinimapZoom] = useState(100);
  const [companionOpen, setCompanionOpen] = useState(true);
  const [companionTab, setCompanionTab] = useState(COMPANION_TABS.VIEWS);
  const [viewport, setViewport] = useState(MOCK_VIEWPORT);
  const [homePosition, setHomePosition] = useState({ row: 0, col: 0 });
  const [isDraggingViewport] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [sidebarSide, setSidebarSide] = useState('left');
  const [minimapHeightOverride, setMinimapHeightOverride] = useState(null);
  const [isResizingMinimap, setIsResizingMinimap] = useState(false);
  const panStartRef = useRef(null);
  const resizeStartRef = useRef(null);

  const filter = useListFilter({
    searchFields: (item) => [item.name, ...(item.views?.map((v) => v.name) || []), ...(item.tags || [])],
    quickFilterDefs: QUICK_FILTERS,
    sortOptions: SORT_OPTIONS,
  });

  const sidebarShowItems = useMemo(() => {
    return [
      { icon: Grid3X3, label: 'VG Outlines', active: showVGOutlines, onClick: () => setShowVGOutlines((p) => !p) },
      { icon: Layers, label: 'Views', active: showViews, onClick: () => setShowViews((p) => !p) },
      { icon: Scan, label: 'Viewport', active: showViewports, onClick: () => setShowViewports((p) => !p) },
      { icon: Users, label: 'Team', active: showCollaborators, onClick: () => setShowCollaborators((p) => !p) },
    ];
  }, [showVGOutlines, showViews, showViewports, showCollaborators]);

  // Separate panel toggle - placed above Show section in toolbar
  const panelToggle = useMemo(() => ({
    icon: companionOpen ? PanelRightClose : PanelRightOpen,
    label: 'Panel',
    active: companionOpen,
    onClick: () => setCompanionOpen((p) => !p),
  }), [companionOpen]);


  const sizeMode = width < 320 ? 'minimal' : width < 400 ? 'compact' : 'standard';
  const dpadSize = sizeMode === 'minimal' ? 76 : sizeMode === 'compact' ? 88 : 100;
  const controlDeckWidth = dpadSize + 32;
  const companionWidth = companionOpen ? (width < 420 ? 160 : 200) : 0;
  const companionSide = sidebarSide === 'left' ? 'right' : 'left'; // Companion opens opposite the toolbar
  const companionLeftOffset = companionOpen && companionSide === 'left' ? companionWidth : 0;
  const companionRightOffset = companionOpen && companionSide === 'right' ? companionWidth : 0;
  const labelSize = sizeMode === 'minimal' ? 16 : 20;
  const mapOuterPadding = 8;
  const mapInset = sizeMode === 'minimal' ? 6 : 8;
  const spacingXs = parseFloat(tokens.spacing.xs) || 4;
  const spacingSm = parseFloat(tokens.spacing.sm) || 6;
  const fontXs = parseFloat(tokens.fontSize.xs) || 9;
  const zoomLabelHeight = fontXs + 4;
  const zoomRowHeight = 22;
  const zoomBlockHeight = zoomLabelHeight + spacingXs + zoomRowHeight;
  const dpadBlockHeight = dpadSize + 6;
  const actionRowHeight = 26 + spacingXs * 2;
  const deckMinHeight = zoomBlockHeight + dpadBlockHeight + actionRowHeight + spacingSm * 2 + spacingSm * 3;
  const bottomMinHeight = Math.max(220, Math.ceil(deckMinHeight));
  const headerHeightEstimate = 40;
  const resizerHeight = 6;
  const innerHeight = Math.max(0, height - headerHeightEstimate);
  const desiredTopHeight = Math.floor(height * 0.55);
  const sidebarButtonHeight = 30;
  const sidebarGap = 6;
  const sidebarPadding = 12;
  const sidebarLabelHeight = fontXs + 4;
  const sidebarButtonCount = sidebarShowItems.length + 2; // +1 for panelToggle, +1 for toggle-side button
  const sidebarMinHeight =
    sidebarPadding + sidebarLabelHeight + sidebarButtonCount * sidebarButtonHeight + sidebarGap * (sidebarButtonCount + 1);
  const availableTopHeight = Math.max(0, innerHeight - bottomMinHeight - resizerHeight);
  const minTopHeight = Math.min(availableTopHeight, Math.max(160, sidebarMinHeight + mapOuterPadding * 2));
  const clampedTopHeight = Math.max(minTopHeight, Math.min(desiredTopHeight, availableTopHeight));
  const topSectionHeight =
    minimapHeightOverride != null
      ? Math.max(minTopHeight, Math.min(availableTopHeight, minimapHeightOverride))
      : clampedTopHeight;
  const bottomSectionHeight = Math.max(bottomMinHeight, innerHeight - topSectionHeight - resizerHeight);
  const gap = sizeMode === 'minimal' ? 2 : 3;
  const sidebarWidth = 56;
  const sidebarVisible = true;
  const rowInnerWidth = Math.max(0, width - mapOuterPadding * 2);
  // Companion panel overlays the minimap rather than pushing it
  const mapViewportWidth = Math.max(
    0,
    rowInnerWidth -
      (sidebarVisible ? sidebarWidth + mapOuterPadding : 0)
  );
  const mapViewportHeight = Math.max(0, topSectionHeight - mapOuterPadding * 2);
  const viewportInnerWidth = Math.max(0, mapViewportWidth - mapInset * 2);
  const viewportInnerHeight = Math.max(0, mapViewportHeight - mapInset * 2);
  const labelOffset = showGridLabels ? labelSize : 0;
  const labelLocked = showGridLabels && lockLabels;
  const gridOffset = labelLocked ? 0 : labelOffset;
  const panContainerOffset = mapInset + (labelLocked ? labelOffset : 0);
  const gridAvailableWidth = Math.max(0, viewportInnerWidth - labelOffset);
  const gridAvailableHeight = Math.max(0, viewportInnerHeight - labelOffset);

  const cellSizeW = Math.floor((gridAvailableWidth - (CANVAS.cols - 1) * gap) / CANVAS.cols);
  const cellSizeH = Math.floor((gridAvailableHeight - (CANVAS.rows - 1) * gap) / CANVAS.rows);
  const cellSize = Math.min(64, Math.max(18, Math.min(cellSizeW, cellSizeH)));
  const zoomScale = minimapZoom / 100;
  const renderCellSize = Math.round(Math.max(10, cellSize * zoomScale));
  const renderGap = Math.round(Math.max(1, gap * zoomScale));
  const gridWidth = (CANVAS.cols + 2) * (renderCellSize + renderGap) - renderGap;
  const gridHeight = (CANVAS.rows + 2) * (renderCellSize + renderGap) - renderGap;
  const contentWidth = gridWidth + (labelLocked ? 0 : labelOffset);
  const contentHeight = gridHeight + (labelLocked ? 0 : labelOffset);
  const gridViewportWidth = Math.max(0, viewportInnerWidth - (labelLocked ? labelOffset : 0));
  const gridViewportHeight = Math.max(0, viewportInnerHeight - (labelLocked ? labelOffset : 0));
  // Allow extra panning beyond content bounds so users can access obstructed areas
  const panPadding = (renderCellSize + renderGap) * 3; // Allow panning ~3 cells beyond bounds
  // Add companion width to pan limits on BOTH sides so user can access full map when companion is open
  const companionPanExtra = companionOpen ? companionWidth : 0;
  const panMinX = Math.min(0, gridViewportWidth - contentWidth) - panPadding - companionPanExtra;
  const panMinY = Math.min(0, gridViewportHeight - contentHeight) - panPadding;
  const panMaxX = panPadding + companionPanExtra;
  const panMaxY = panPadding;
  const safePanOffset = {
    x: Math.min(panMaxX, Math.max(panMinX, panOffset.x)),
    y: Math.min(panMaxY, Math.max(panMinY, panOffset.y)),
  };
  const showHorizontalFade = contentWidth > gridViewportWidth + 1 || safePanOffset.x !== 0;
  const showVerticalFade = contentHeight > gridViewportHeight + 1 || safePanOffset.y !== 0;

  const flattenedViews = useMemo(() => flattenViewsToCanvas(MOCK_VIEWGROUPS), []);
  const filteredVGs = useMemo(() => filter.applyFilters(MOCK_VIEWGROUPS), [filter]);
  const visibleVGs = useMemo(() => filteredVGs.filter((vg) => vg.position), [filteredVGs]);
  const currentPositionLabel = formatCellRef(viewport.position.row, viewport.position.col);
  const isAtHome = viewport.position.row === homePosition.row && viewport.position.col === homePosition.col;
  const canvasSizeLabel = `${CANVAS.cols}x${CANVAS.rows}`;
  const openViewportCount = flattenedViews.length;
  const availableTags = useMemo(
    () => Array.from(new Set(MOCK_VIEWGROUPS.flatMap((vg) => vg.tags || []))),
    []
  );
  const handleMove = useCallback(
    (dir) => {
      setViewport((prev) => ({
        ...prev,
        position: {
          row: Math.max(0, Math.min(CANVAS.rows - prev.size.rows, prev.position.row + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0))),
          col: Math.max(0, Math.min(CANVAS.cols - prev.size.cols, prev.position.col + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0))),
        },
      }));
    },
    [setViewport]
  );

  const handleDragStart = useCallback((e, type, data) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, data }));
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setSidebarSide((prev) => (prev === 'left' ? 'right' : 'left'));
  }, []);

  const clamp = useCallback((value, min, max) => Math.min(max, Math.max(min, value)), []);

  const handleMinimapResizeStart = useCallback(
    (event) => {
      resizeStartRef.current = { startY: event.clientY, startHeight: topSectionHeight };
      setIsResizingMinimap(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [topSectionHeight]
  );

  const handlePanStart = useCallback(
    (event) => {
      if (event.button !== 0) return;
      panStartRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: safePanOffset.x,
        originY: safePanOffset.y,
        minX: panMinX,
        minY: panMinY,
        maxX: panMaxX,
        maxY: panMaxY,
      };
      setIsPanning(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [panMinX, panMinY, panMaxX, panMaxY, safePanOffset]
  );

  const handlePanMove = useCallback(
    (event) => {
      const start = panStartRef.current;
      if (!start) return;
      const nextX = start.originX + (event.clientX - start.startX);
      const nextY = start.originY + (event.clientY - start.startY);
      const clampedX = clamp(nextX, start.minX, start.maxX);
      const clampedY = clamp(nextY, start.minY, start.maxY);
      setPanOffset({ x: clampedX, y: clampedY });
    },
    [clamp]
  );

  const handlePanEnd = useCallback((event) => {
    if (!panStartRef.current) return;
    panStartRef.current = null;
    setIsPanning(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  useEffect(() => {
    if (!isResizingMinimap) return;

    const handleMove = (event) => {
      if (!resizeStartRef.current) return;
      const next = resizeStartRef.current.startHeight + (event.clientY - resizeStartRef.current.startY);
      setMinimapHeightOverride(clamp(next, minTopHeight, availableTopHeight));
    };

    const handleUp = () => {
      setIsResizingMinimap(false);
      resizeStartRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isResizingMinimap, clamp, minTopHeight, availableTopHeight]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg, padding: tokens.spacing.xl, background: tokens.colors.bg.base }}>
      {showDebugControls && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.lg,
            flexWrap: 'wrap',
            padding: tokens.spacing.md,
            background: tokens.colors.bg.secondary,
            borderRadius: tokens.radius.lg,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
            <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted }}>Width:</span>
            <input
              type="range"
              min="300"
              max="700"
              value={width}
              onChange={() => {}}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.secondary, minWidth: 45 }}>{width}px</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
            <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted }}>Height:</span>
            <input
              type="range"
              min="500"
              max="900"
              value={height}
              onChange={() => {}}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.secondary, minWidth: 45 }}>{height}px</span>
          </div>
          <span
            style={{
              padding: '4px 12px',
              background: tokens.colors.glass.medium,
              borderRadius: tokens.radius.md,
              fontSize: tokens.fontSize.sm,
              color: tokens.colors.accent.blue,
            }}
          >
            {sizeMode}
          </span>
        </div>
      )}

      <div
        style={{
          width,
          height,
          background: tokens.colors.glass.frosted,
          backdropFilter: tokens.blur.strong,
          WebkitBackdropFilter: tokens.blur.strong,
          borderRadius: tokens.radius.xl,
          border: `1px solid ${tokens.colors.border.glow}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: `0 12px 48px rgba(0,0,0,0.5), 0 0 1px rgba(96, 165, 250, 0.3), inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
            background: `linear-gradient(180deg, ${tokens.colors.glass.medium} 0%, ${tokens.colors.glass.subtle} 100%)`,
            borderBottom: `1px solid ${tokens.colors.border.default}`,
            boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.2)',
          }}
        >
          <Grip size={12} style={{ color: tokens.colors.text.muted }} />
          <Compass size={14} style={{ color: tokens.colors.accent.blue }} />
          <span
            style={{
              flex: 1,
              fontSize: tokens.fontSize.md,
              fontWeight: 600,
              color: tokens.colors.text.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Canvas
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              flex: '0 0 auto',
              height: topSectionHeight,
              display: 'flex',
              position: 'relative', // For companion panel overlay positioning
              background: tokens.colors.canvas.bg,
              minHeight: 0,
              padding: mapOuterPadding,
              gap: mapOuterPadding,
            }}
          >
            {sidebarVisible && sidebarSide === 'left' && (
              <MapSidebar
                side={sidebarSide}
                onToggleSide={handleSidebarToggle}
                showItems={sidebarShowItems}
                panelToggle={panelToggle}
              />
            )}

            <div
              style={{
                flex: 1,
                position: 'relative',
                minHeight: 0,
                overflow: 'visible',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: companionLeftOffset,
                  right: companionRightOffset,
                  background: `linear-gradient(135deg, ${tokens.colors.canvas.cell} 0%, ${tokens.colors.bg.primary} 100%)`,
                  borderRadius: tokens.radius.lg,
                  border: `1px solid ${tokens.colors.border.subtle}`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                  cursor: isPanning ? 'grabbing' : 'grab',
                }}
                onPointerDown={handlePanStart}
                onPointerMove={handlePanMove}
                onPointerUp={handlePanEnd}
                onPointerLeave={handlePanEnd}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: panContainerOffset,
                    left: panContainerOffset,
                    transform: `translate(${safePanOffset.x}px, ${safePanOffset.y}px)`,
                  }}
                >
                  <div style={{ position: 'relative', width: contentWidth, height: contentHeight }}>
                    {showGridLabels && !labelLocked && (
                      <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: labelOffset,
                      height: labelOffset,
                      background: 'linear-gradient(135deg, rgba(6,10,18,0.95), rgba(6,10,18,0.7))',
                    }}
                  />
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: labelOffset,
                            height: labelOffset,
                            width: (CANVAS.cols + 1) * (renderCellSize + renderGap) - renderGap,
                            display: 'flex',
                            background: 'rgba(6, 10, 18, 0.92)',
                            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                          }}
                        >
                          {Array.from({ length: CANVAS.cols }).map((_, col) => (
                            <div
                              key={col}
                              style={{
                                width: renderCellSize,
                                marginRight: col < CANVAS.cols - 1 ? renderGap : 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: tokens.fontSize.xs,
                                fontWeight: 600,
                                color: tokens.colors.accent.amber,
                                fontFamily: 'monospace',
                              }}
                            >
                              {colToLetter(col)}
                            </div>
                          ))}
                        </div>
                        <div
                          style={{
                            position: 'absolute',
                            top: labelOffset,
                            left: 0,
                            width: labelOffset,
                            height: (CANVAS.rows + 1) * (renderCellSize + renderGap) - renderGap,
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'rgba(6, 10, 18, 0.92)',
                            borderRight: `1px solid ${tokens.colors.border.subtle}`,
                          }}
                        >
                          {Array.from({ length: CANVAS.rows }).map((_, row) => (
                            <div
                              key={row}
                              style={{
                                height: renderCellSize,
                                marginBottom: row < CANVAS.rows - 1 ? renderGap : 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: tokens.fontSize.xs,
                                fontWeight: 600,
                                color: tokens.colors.accent.amber,
                                fontFamily: 'monospace',
                              }}
                            >
                              {row + 1}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div
                      style={{
                        position: 'absolute',
                        top: gridOffset - (renderCellSize + renderGap),
                        left: gridOffset - (renderCellSize + renderGap),
                        width: (CANVAS.cols + 2) * (renderCellSize + renderGap) - renderGap,
                        height: (CANVAS.rows + 2) * (renderCellSize + renderGap) - renderGap,
                        overflow: 'visible',
                      }}
                    >
                      <GridPaperBackground
                        rows={CANVAS.rows + 2}
                        cols={CANVAS.cols + 2}
                        cellSize={renderCellSize}
                        gap={renderGap}
                        visible={showGridPaper}
                        offsetX={0}
                        offsetY={0}
                      />

                      <div
                        style={{
                          position: 'absolute',
                          top: renderCellSize + renderGap,
                          left: renderCellSize + renderGap,
                        }}
                      >
                        {mapMode === MAP_MODES.LINKS && (
                          <LinkLines
                            links={MOCK_VG_LINKS}
                            viewGroups={MOCK_VIEWGROUPS}
                            cellSize={renderCellSize}
                            gap={renderGap}
                            highlightedId={highlightedLinkId}
                            onLinkClick={setHighlightedLinkId}
                          />
                        )}

                        {/* VG Outlines - can be shown independently or with views */}
                        {showVGOutlines &&
                          visibleVGs.map((vg) => (
                            <VGBlock
                              key={vg.id}
                              vg={vg}
                              cellSize={renderCellSize}
                              gap={renderGap}
                              isSelected={selectedVGId === vg.id}
                              onClick={() => setSelectedVGId(vg.id)}
                              // When showing both, make VG outlines more subtle
                              subtle={showViews}
                            />
                          ))}

                        {/* Individual Views - can be shown independently or with VG outlines */}
                        {showViews &&
                          flattenedViews.map((view) => (
                            <ViewCell
                              key={view.id}
                              view={view}
                              cellSize={renderCellSize}
                              gap={renderGap}
                              isSelected={selectedVGId === view.vgId}
                              onClick={() => setSelectedVGId(view.vgId)}
                            />
                          ))}

                        {showViewports && (
                          <ViewportIndicator
                            viewport={viewport}
                            cellSize={renderCellSize}
                            gap={renderGap}
                            isDragging={isDraggingViewport}
                            onMouseDown={() => {}}
                          />
                        )}

                        {showCollaborators && (
                          <CollaboratorIndicators
                          collaborators={MOCK_COLLABORATORS}
                          cellSize={renderCellSize}
                          gap={renderGap}
                          showCursors={showCursors}
                        />
                      )}
                    </div>
                  </div>
                </div>
                </div>

                {showGridLabels && labelLocked && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: mapViewportWidth,
                      height: mapViewportHeight,
                      pointerEvents: 'none',
                      zIndex: 18,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: labelOffset,
                        height: labelOffset,
                        background: '#000000',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: labelOffset,
                        width: mapViewportWidth - labelOffset,
                        height: labelOffset,
                        display: 'flex',
                        overflow: 'hidden',
                        background: 'rgba(6, 10, 18, 0.92)',
                        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          transform: `translateX(${safePanOffset.x + mapInset}px)`,
                        }}
                      >
                        {Array.from({ length: CANVAS.cols }).map((_, col) => (
                          <div
                            key={col}
                            style={{
                              width: renderCellSize,
                              marginRight: col < CANVAS.cols - 1 ? renderGap : 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: tokens.fontSize.xs,
                              fontWeight: 600,
                              color: tokens.colors.accent.amber,
                              fontFamily: 'monospace',
                            }}
                          >
                            {colToLetter(col)}
                          </div>
                        ))}
                      </div>
                  </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: labelOffset,
                        left: 0,
                        width: labelOffset,
                        height: mapViewportHeight - labelOffset,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        background: 'rgba(6, 10, 18, 0.92)',
                        borderRight: `1px solid ${tokens.colors.border.subtle}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          transform: `translateY(${safePanOffset.y + mapInset}px)`,
                        }}
                      >
                        {Array.from({ length: CANVAS.rows }).map((_, row) => (
                          <div
                            key={row}
                            style={{
                              height: renderCellSize,
                              marginBottom: row < CANVAS.rows - 1 ? renderGap : 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: tokens.fontSize.xs,
                              fontWeight: 600,
                              color: tokens.colors.accent.amber,
                              fontFamily: 'monospace',
                            }}
                          >
                            {row + 1}
                          </div>
                        ))}
                      </div>
                  </div>
                  </div>
                )}

                {(showHorizontalFade || showVerticalFade) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: labelLocked ? labelOffset : 0,
                      left: labelLocked ? labelOffset : 0,
                      right: 0,
                      bottom: 0,
                      pointerEvents: 'none',
                      zIndex: 14,
                      borderRadius: tokens.radius.md,
                    }}
                  >
                    {showHorizontalFade && (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 28,
                            height: '100%',
                            background: 'linear-gradient(90deg, rgba(6,10,18,0.9), rgba(6,10,18,0))',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 36,
                            height: '100%',
                            background: 'linear-gradient(270deg, rgba(6,10,18,0.9), rgba(6,10,18,0))',
                          }}
                        />
                      </>
                    )}
                    {showVerticalFade && (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: 28,
                            background: 'linear-gradient(180deg, rgba(6,10,18,0.9), rgba(6,10,18,0))',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            width: '100%',
                            height: 36,
                            background: 'linear-gradient(0deg, rgba(6,10,18,0.9), rgba(6,10,18,0))',
                          }}
                        />
                      </>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        right: 12,
                        bottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 8px',
                        borderRadius: tokens.radius.md,
                        background: 'rgba(2, 6, 16, 0.65)',
                        border: `1px solid ${tokens.colors.border.subtle}`,
                        color: tokens.colors.text.muted,
                        fontSize: tokens.fontSize.xs,
                        letterSpacing: '0.2px',
                      }}
                    >
                      <Move size={12} />
                      Drag to pan
                    </div>
                  </div>
                )}
              </div>

            </div>

            {sidebarVisible && sidebarSide === 'right' && (
              <MapSidebar side={sidebarSide} onToggleSide={handleSidebarToggle} showItems={sidebarShowItems} panelToggle={panelToggle} />
            )}

            <CompanionPanel
              isOpen={companionOpen}
              onClose={() => setCompanionOpen(false)}
              activeTab={companionTab}
              setActiveTab={setCompanionTab}
              viewGroups={MOCK_VIEWGROUPS}
              unplacedViews={MOCK_UNPLACED_VIEWS}
              datasets={MOCK_DATASETS}
              sizeMode={sizeMode}
              width={companionWidth}
              showToolbar
              onDragStart={handleDragStart}
              overlay // Companion overlays minimap instead of pushing it
              side={sidebarSide === 'left' ? 'right' : 'left'} // Opposite side of toolbar
            />
          </div>

          <div
            onPointerDown={handleMinimapResizeStart}
            style={{
              height: resizerHeight,
              cursor: 'row-resize',
              background: tokens.colors.bg.tertiary,
              borderTop: `1px solid ${tokens.colors.border.subtle}`,
              borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            }}
          />

          <div
            style={{
              flex: '0 0 auto',
              height: bottomSectionHeight,
              minHeight: bottomMinHeight,
              borderTop: `1px solid ${tokens.colors.border.subtle}`,
              background: tokens.colors.bg.secondary,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
              <LayoutControlDeck
                minimapZoom={minimapZoom}
                onZoomIn={() => setMinimapZoom((p) => Math.min(150, p + 10))}
                onZoomOut={() => setMinimapZoom((p) => Math.max(50, p - 10))}
                onZoomReset={() => setMinimapZoom(100)}
                companionOpen={companionOpen}
                toggleCompanion={() => setCompanionOpen((p) => !p)}
                currentPositionLabel={currentPositionLabel}
                isAtHome={isAtHome}
                canvasSizeLabel={canvasSizeLabel}
                openViewportCount={openViewportCount}
                onMove={handleMove}
                onGoHome={() => setViewport((p) => ({ ...p, position: homePosition }))}
                onSetHome={() => setHomePosition(viewport.position)}
                onFitAll={() => {}}
                onAddBookmark={() => {}}
                sizeMode={sizeMode}
                deckWidth={controlDeckWidth}
              />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ padding: tokens.spacing.sm, borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
                  <LayoutSearchRow filter={filter} tagOptions={availableTags} />
                  <div style={{ marginTop: tokens.spacing.xs }}>
                    <ModeTabsPill activeMode={mapMode} onModeChange={setMapMode} />
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <ContextualPanelContent
                    mode={mapMode}
                    viewport={viewport}
                    setViewport={setViewport}
                    homePosition={homePosition}
                    viewGroups={MOCK_VIEWGROUPS}
                    selectedVGId={selectedVGId}
                    setSelectedVGId={setSelectedVGId}
                    links={MOCK_VG_LINKS}
                    highlightedLinkId={highlightedLinkId}
                    setHighlightedLinkId={setHighlightedLinkId}
                    collaborators={MOCK_COLLABORATORS}
                    showCursors={showCursors}
                    setShowCursors={setShowCursors}
                    bookmarks={MOCK_BOOKMARKS}
                    filter={filter}
                    sizeMode={sizeMode}
                    showToolbar={false}
                    linksSubTab={linksSubTab}
                    setLinksSubTab={setLinksSubTab}
                    teamSubTab={teamSubTab}
                    setTeamSubTab={setTeamSubTab}
                    isBroadcasting={isBroadcasting}
                    setIsBroadcasting={setIsBroadcasting}
                    cursorVisible={cursorVisible}
                    setCursorVisible={setCursorVisible}
                    cursorColor={cursorColor}
                    setCursorColor={setCursorColor}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasMapV2Spec;
