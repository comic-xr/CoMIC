// src/ui/react/components/organisms/index.js
// Barrel export for all organism components
// Organisms are complex UI components composed of molecules and atoms

// =============================================================================
// ORGANISMS (complex composed components)
// =============================================================================

// InstanceCard - View/instance card with color bar and metadata
export { InstanceCard, INSTANCE_CARD_VARIANTS, INSTANCE_CARD_COLOR_POSITIONS } from './InstanceCard';

// ToolPanel - Slide-out tool panel with header and content
export { ToolPanel } from './ToolPanel';

// WorkspaceOverlay - Full-screen overlay for workspace modes
export { WorkspaceOverlay } from './WorkspaceOverlay';

// ResizableSections - Resizable panel sections
export { ResizableSections } from './ResizableSections';

// SectionNavGroup - Section group with dot navigation and scroll detection
export { SectionNavGroup, useSectionNavSections } from './SectionNavGroup';

// PropertyPanel - Property inspector/editor panel
export { PropertyPanel } from './PropertyPanel';

// FilterBar - Search and filter bar
export { FilterBar } from './FilterBar';

// FilterToolbar - Unified filter system with responsive layouts
export { FilterToolbar, LAYOUT_BREAKPOINTS } from './FilterToolbar';

// =============================================================================
// TOOLBAR/BAR ORGANISMS (moved from bars/)
// =============================================================================

// RoomPresenceIndicator - Room indicator with presence avatars
export { RoomPresenceIndicator } from './RoomPresenceIndicator';

// ViewContextBlock - Unified view context display (mode, view, links, actions)
export { ViewContextBlock, ViewHubFlyout, VIEW_TYPE_ICONS } from './ViewContextBlock';

// VoiceControlsPanel - Voice command controls panel
export { VoiceControlsPanel } from './VoiceControlsPanel';

// =============================================================================
// MODE TOGGLE ORGANISMS (moved from controls/)
// =============================================================================

// LayoutModeToggle - Normal/Isolation/Subset mode toggle (built on SegmentedToggle)
export {
    LayoutModeToggle,
    LayoutModeIndicator,
    LAYOUT_MODES,
    LAYOUT_MODE_INFO,
    useLayoutModeToggle,
    useLayoutModeKeyboardShortcut,
} from './LayoutModeToggle';

// ViewModeToggle - Desktop/VR mode toggle (built on SegmentedToggle)
export {
    ViewModeToggle,
    ViewModeIndicator,
    VIEW_MODES,
    useViewModeToggle,
    useWebXRAvailability,
    useViewModeKeyboardShortcut,
    useGlobalKeyboardShortcuts,
} from './ViewModeToggle';

// =============================================================================
// LINK MANAGER PANELS (View Linking System)
// =============================================================================

// ViewLinkManager - Main panel for managing view-to-view links
// UserFollowingPanel - Panel for following other users' views
// WorkspaceLinksHub - Overview of all sync groups in workspace
export {
    ViewLinkManager,
    UserFollowingPanel,
    WorkspaceLinksHub,
    LINK_PROPERTIES,
    LINK_MODES,
    getPropertyById,
    getModeById,
    getModeIconChar,
} from './LinkManagerPanels';

// =============================================================================
// CANVAS CHROME ORGANISMS
// =============================================================================

// RoomHeader - Room-level navigation with section-based layout
// Layout: ROOM (viewing + presence) | PINNED | VOICE | CHAT
export {
    RoomHeader,
    RoomSection,
    PinnedSection,
    VoiceSection,
    ChatSection,
    useRoomSection,
    usePinnedSection,
    useVoiceState,
    useDropdowns,
    ROOM_HEADER_CONFIG,
} from './RoomHeader';

// WorkspaceBar - Workspace tabs, mode toggle, popout/breakout managers
// Layout: WORKSPACE | MODE | POPOUTS | BREAKOUTS
// Note: ModeToggle not re-exported here to avoid conflict with CanvasTabsBar ModeToggle
export {
    WorkspaceBar,
    WorkspaceTab,
    PopoutManager,
    BreakoutManager,
    useWorkspaceBar,
    useManagerDropdowns,
} from './WorkspaceBar';

// Footer2 - Canvas toolbar footer with ViewGroup selector and links
export {
    Footer2,
    useFooterLayout,
    useViewGroupSelector,
    useLinkStats,
    useLinkReminderToast,
    useDuplicationDialog,
    FOOTER_BREAKPOINTS,
    TOOLBAR_SECTIONS,
    LINK_PROPERTIES as FOOTER_LINK_PROPERTIES,
    TYPE_SPECIFIC_LINK_PROPERTIES,
    QUICK_CREATE_TEMPLATES,
    ViewGroupSelector,
    ViewGroupRow,
    CreateViewGroupPopover,
    ViewGroupSettingsPopover,
    LinksSection,
    ExpandedLinks,
    CollapsedLinksIndicator,
    LinksPopover,
    LinkPropertyPopover,
    LinkPropertyIndicator,
} from './Footer2';

// VRWristMenu - VR wrist-mounted radial menu
export { VRWristMenu } from './VRWristMenu';

// CanvasTabsBar - Workspace tabs with mode toggle and popout/breakout managers
export {
    CanvasTabsBar,
    CanvasTab,
    ModeToggle,
    CreateOpenPopover,
    WORKSPACE_TYPES,
    CREATE_OPTIONS,
    useWorkspaceTabs,
    useTabDragDrop,
    useCloseConfirmation,
    usePopoverState,
    useWorkspaceSearch,
} from './CanvasTabsBar';

// TiledCanvasView - Multi-canvas grid with resizable dividers
export {
    TiledCanvasView,
    CanvasPanel,
    MiniCanvasHeader,
    ResizableDivider,
    CANVAS_SIZING,
    WORKSPACE_TYPE_CONFIG,
    useSplitRatio,
    useOpenWorkspaces,
    getLayoutConfig,
} from './TiledCanvasView';

// TabbedCanvasView - Single canvas full-size display
export {
    TabbedCanvasView,
    FullCanvasHeader,
} from './TabbedCanvasView';
