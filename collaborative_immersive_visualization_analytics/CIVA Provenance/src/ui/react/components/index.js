/**
 * UI Components - Unified Exports
 * 
 * Clean, centralized exports for all UI components following Atomic Design.
 * Makes it easier to import components without knowing exact file paths.
 * 
 * USAGE:
 * import { Button, Icon, Badge } from '@UI/react/components';
 * import { LeftPanel, RightPanel } from '@UI/react/components/layout';
 */

// ============================================================================
// ATOMS - Foundational Building Blocks
// ============================================================================

export {
  Button,
  IconButton,
  Icon,
  Badge,
  StatusDot,
  Chip,
  Toggle,
  Divider,
  Spinner,
  Text,
  Input,
  Select,
  Checkbox,
  Radio,
  Slider,
  Tooltip,
  Tag,
  Label,
  PresenceIndicator,
  Thumbnail,
  Dropdown,
} from './atoms/index.js';

// Icon components
export {
  IconAdd,
  IconRemove,
  IconClose,
  IconCheck,
  IconEdit,
  IconDelete,
  IconSave,
  IconCopy,
  IconSearch,
  IconFilter,
  IconMenu,
  IconSettings,
  IconFolder,
  IconFile,
  IconDownload,
  IconUpload,
  IconPlay,
  IconPause,
  IconVolume,
  IconMic,
  IconCamera,
  IconShare,
  IconMore,
  IconExpand,
  IconCollapse,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
  IconArrowDown,
  IconArrowUp,
  IconArrowLeft,
  IconArrowRight,
  IconStar,
  IconBookmark,
  IconLink,
  IconLock,
  IconUnlock,
  IconEye,
  IconEyeOff,
  IconBell,
  IconInfo,
  IconWarning,
  IconError,
  IconSuccess,
  IconHelp,
  IconHome,
  IconGrid,
  IconList,
  IconDashboard,
} from './atoms/Icon/iconComponents.js';

// ============================================================================
// MOLECULES - Composed from Atoms
// ============================================================================

export {
  LabeledButton,
  TabButton,
  MenuItem,
  DirectionalButton,
  ToggleGroup,
  StatusIndicator,
  InfoRow,
  SearchInput,
  PanelHeader,
  PanelFooter,
  Section,
  Tabs,
  Toast,
  Breadcrumb,
  ViewCard,
  InstanceCard,
  DatasetItem,
  ViewItem,
  MemberRow,
  EmptyState,
  HeaderSection,
  TabBar,
  NavDotBar,
  SegmentedToggle,
  ModeSelector,
  NavButtonCluster,
  PropertySelector,
  SliderMenuOption,
  ThumbnailPreview,
  CanvasNavigation,
  ColorSwatchGrid,
  CameraGrid,
  GroupMembersList,
  OptionList,
  PopoutButtons,
  VRButton,
  VRExploreButton,
  WorkspaceSelector,
  SectionNavHeader,
  FlowDirectionToggle,
  SubtabBar,
  CanvasLinkIndicators,
  VoiceCommandToggle,
  ForumLink,
} from './molecules/index.js';

// ============================================================================
// ORGANISMS - Complex Functional Units
// ============================================================================

export {
  LeftPanel,
  RightPanel,
  TopBar,
  BottomBar,
  ResizableSections,
  FilterBar,
  PropertyPanel,
  ToolPanel,
  LayoutModeToggle,
  WorkspaceOverlay,
  RoomPresenceIndicator,
  VoiceControlsPanel,
  InstanceCard,
} from './organisms/index.js';

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

export { FloatingPanel, FloatingPanelContent } from './layout/FloatingPanel/index.js';

// ============================================================================
// AUTH COMPONENTS
// ============================================================================

export { Bootstrap, AuthScreen, LoginForm } from './auth/index.js';

// ============================================================================
// CONTEXT & PROVIDERS
// ============================================================================

export { AdaptiveProvider, useAdaptive } from '../context/AdaptiveContext.jsx';
