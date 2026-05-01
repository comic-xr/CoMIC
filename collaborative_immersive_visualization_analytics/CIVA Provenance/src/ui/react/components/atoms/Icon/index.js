// =============================================================================
// ICON SYSTEM - PUBLIC EXPORTS
// =============================================================================
//
// Material Symbols icon system for CIA Web
// Source: https://fonts.google.com/icons
//
// Usage:
//   import { Icon } from '@UI/react/components/atoms/Icon';
//   <Icon name="close" size={20} />
//
// Legacy/Backwards compatible:
//   import { IconClose, getIconComponent } from '@UI/react/components/atoms/Icon';
//   const MyIcon = getIconComponent('settings');
//
// =============================================================================

// Main component
export { default } from "./Icon";
export { default as Icon } from "./Icon";

// Utility functions from Icon.jsx
export { hasIcon, getAvailableIcons, getUsedSymbols } from "./Icon";

// Registry (for advanced usage)
export { ICON_REGISTRY, getSymbolName } from "./iconRegistry";

// Paths (for custom implementations)
export { ICON_PATHS, ICON_VIEWBOX } from "./iconPaths";

// =============================================================================
// BACKWARDS COMPATIBILITY EXPORTS
// =============================================================================
// Re-export everything from iconComponents for legacy code support

export {
  // Size presets
  ICON_SIZES,

  // Function to get icon component by name
  getIconComponent,

  // Named icon exports - Navigation
  IconChevronDown,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,

  // Actions
  IconAdd,
  IconRemove,
  IconClose,
  IconCheck,
  IconEdit,
  IconDelete,
  IconSave,
  IconCopy,
  IconUndo,
  IconRedo,
  IconRefresh,
  IconRotateCw,
  IconRotateCcw,
  IconSearch,
  IconFilter,
  IconCancel,

  // View & Display
  IconEye,
  IconEyeOff,
  IconZoomIn,
  IconZoomOut,
  IconFullscreen,
  IconFullscreenExit,
  IconMaximize,
  IconMinimize,
  IconExpand,
  IconCollapse,

  // 3D & Spatial
  IconBox,
  IconCube,
  IconRotate3d,
  IconMove,
  IconLayers,

  // VR & Immersive
  IconVR,
  IconVRHeadset,
  IconSpatialAudio,
  IconGesture,
  IconController,

  // Tools & Editing
  IconPen,
  IconBrush,
  IconEraser,
  IconScissors,
  IconRuler,
  IconPalette,
  IconSliders,
  IconSettings,
  IconTools,
  IconTarget,
  IconCrosshair,
  IconWand,

  // Data & Files
  IconFile,
  IconFolder,
  IconFolderOpen,
  IconDatabase,
  IconDataset,
  IconUpload,
  IconDownload,
  IconArchive,

  // Media & Communication
  IconMic,
  IconMicOff,
  IconVideo,
  IconVideoOff,
  IconCamera,
  IconVolume,
  IconVolumeOff,
  IconPlay,
  IconPause,
  IconStop,
  IconRecord,
  IconImage,

  // Users & Collaboration
  IconUser,
  IconUsers,
  IconUserPlus,
  IconShare,
  IconChat,
  IconComment,
  IconSend,
  IconBell,

  // UI & Layout
  IconMenu,
  IconMoreHorizontal,
  IconMoreVertical,
  IconGrid,
  IconList,
  IconLayout,
  IconDashboard,
  IconGripHorizontal,
  IconGripVertical,
  IconDragHandle,

  // Status & Feedback
  IconInfo,
  IconWarning,
  IconError,
  IconSuccess,
  IconHelp,
  IconLoader,
  IconDot,

  // Science & Domain
  IconBiotech,
  IconScience,
  IconAtom,
  IconBrain,
  IconDna,
  IconHeart,
  IconChart,
  IconGraph,
  IconScatterChart,

  // Navigation & Location
  IconCompass,
  IconHome,
  IconMap,
  IconLocation,
  IconGlobe,
  IconNavigation,

  // Time & Scheduling
  IconClock,
  IconCalendar,

  // Security & Access
  IconLock,
  IconUnlock,
  IconShield,
  IconKey,

  // Bookmarks & Favorites
  IconBookmark,
  IconStar,
  IconStarOutline,
  IconPin,

  // Links & External
  IconLink,
  IconLinkOff,
  IconExternalLink,
  IconLogout,
  IconLogin,

  // Devices & Hardware
  IconKeyboard,
  IconMonitor,
  IconDesktop,
  IconHeadphones,
  IconHeadset,
  IconHeadsetMic,
  IconTerminal,
  IconCode,
  IconCpu,
  IconMemory,

  // Toggles & Modes
  IconSun,
  IconMoon,

  // Misc
  IconZap,
  IconRocket,
  IconCompare,
  IconMerge,
  IconGitBranch,
} from "./iconComponents";
