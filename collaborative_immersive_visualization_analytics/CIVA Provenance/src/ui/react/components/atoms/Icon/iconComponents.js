// =============================================================================
// ICON COMPONENTS - BACKWARDS COMPATIBILITY LAYER
// =============================================================================
//
// Provides named icon exports (IconClose, IconLoader, etc.) and
// getIconComponent() function for backwards compatibility with existing code.
//
// New code should use: <Icon name="close" />
// Legacy code can use: <IconClose /> or getIconComponent('close')
//
// =============================================================================

import React, { memo } from "react";
import { ICON_PATHS, ICON_VIEWBOX } from "@UI/react/components/atoms/Icon/iconPaths";
import { ICON_REGISTRY, getSymbolName, hasIcon } from "@UI/react/components/atoms/Icon/iconRegistry";

// =============================================================================
// SIZE PRESETS
// =============================================================================

export const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

// =============================================================================
// ICON COMPONENT FACTORY
// =============================================================================

/**
 * Creates a memoized icon component for a specific icon name.
 * Used internally to generate named exports like IconClose, IconSettings, etc.
 */
function createIconComponent(iconName) {
  const symbolName = hasIcon(iconName) ? getSymbolName(iconName) : iconName;
  const path = ICON_PATHS[symbolName] || ICON_PATHS.frame_bug; //ICON_PATHS.help_outline;

  const IconComponent = memo(function IconComponent({
    size = "sm",
    color,
    className = "",
    style,
    ...props
  }) {
    // Resolve size
    const resolvedSize =
      typeof size === "number" ? size : ICON_SIZES[size] || ICON_SIZES.sm;

    return (
      <svg
        className={`cia-icon ${className}`.trim()}
        viewBox={ICON_VIEWBOX}
        fill="currentColor"
        width={resolvedSize}
        height={resolvedSize}
        style={{
          minWidth: resolvedSize,
          minHeight: resolvedSize,
          color,
          ...style,
        }}
        role="presentation"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        <path d={path} />
      </svg>
    );
  });

  IconComponent.displayName = `Icon${
    iconName.charAt(0).toUpperCase() + iconName.slice(1)
  }`;

  return IconComponent;
}

// =============================================================================
// getIconComponent FUNCTION
// =============================================================================

/**
 * Get an icon component by name.
 * Returns a memoized React component that renders the specified icon.
 *
 * @param {string} name - Icon name (semantic or Material Symbol)
 * @returns {React.Component} Memoized icon component
 *
 * @example
 * const CloseIcon = getIconComponent('close');
 * <CloseIcon size="lg" color="#ff0000" />
 */
export function getIconComponent(name) {
  if (!name) {
    console.warn("[Icon] getIconComponent called without name");
    return createIconComponent("help");
  }
  return createIconComponent(name);
}

// =============================================================================
// NAMED ICON EXPORTS
// =============================================================================
// These provide backwards compatibility with imports like:
// import { IconClose, IconSettings } from '@UI/react/components/atoms/Icon';

// Navigation & Arrows
export const IconChevronDown = createIconComponent("chevronDown");
export const IconChevronUp = createIconComponent("chevronUp");
export const IconChevronLeft = createIconComponent("chevronLeft");
export const IconChevronRight = createIconComponent("chevronRight");
export const IconArrowUp = createIconComponent("arrowUp");
export const IconArrowDown = createIconComponent("arrowDown");
export const IconArrowLeft = createIconComponent("arrowLeft");
export const IconArrowRight = createIconComponent("arrowRight");

// Actions
export const IconAdd = createIconComponent("add");
export const IconRemove = createIconComponent("remove");
export const IconClose = createIconComponent("close");
export const IconCheck = createIconComponent("check");
export const IconEdit = createIconComponent("edit");
export const IconDelete = createIconComponent("delete");
export const IconSave = createIconComponent("save");
export const IconCopy = createIconComponent("copy");
export const IconUndo = createIconComponent("undo");
export const IconRedo = createIconComponent("redo");
export const IconRefresh = createIconComponent("refresh");
export const IconRotateCw = createIconComponent("rotateCw");
export const IconRotateCcw = createIconComponent("rotateCcw");
export const IconSearch = createIconComponent("search");
export const IconFilter = createIconComponent("filter");
export const IconCancel = createIconComponent("cancel");

// View & Display
export const IconEye = createIconComponent("eye");
export const IconEyeOff = createIconComponent("eyeOff");
export const IconZoomIn = createIconComponent("zoomIn");
export const IconZoomOut = createIconComponent("zoomOut");
export const IconFullscreen = createIconComponent("fullscreen");
export const IconFullscreenExit = createIconComponent("fullscreenExit");
export const IconMaximize = createIconComponent("maximize");
export const IconMinimize = createIconComponent("minimize");
export const IconExpand = createIconComponent("expand");
export const IconCollapse = createIconComponent("collapse");

// 3D & Spatial
export const IconBox = createIconComponent("box");
export const IconCube = createIconComponent("cube");
export const IconRotate3d = createIconComponent("rotate3d");
export const IconMove = createIconComponent("move");
export const IconLayers = createIconComponent("layers");

// VR & Immersive
export const IconVR = createIconComponent("vr");
export const IconVRHeadset = createIconComponent("vrHeadset");
export const IconSpatialAudio = createIconComponent("spatialAudio");
export const IconGesture = createIconComponent("gesture");
export const IconController = createIconComponent("controller");

// Tools & Editing
export const IconPen = createIconComponent("pen");
export const IconBrush = createIconComponent("brush");
export const IconEraser = createIconComponent("eraser");
export const IconScissors = createIconComponent("scissors");
export const IconRuler = createIconComponent("ruler");
export const IconPalette = createIconComponent("palette");
export const IconSliders = createIconComponent("sliders");
export const IconSettings = createIconComponent("settings");
export const IconTools = createIconComponent("tools");
export const IconTarget = createIconComponent("target");
export const IconCrosshair = createIconComponent("crosshair");
export const IconWand = createIconComponent("wand");

// Data & Files
export const IconFile = createIconComponent("file");
export const IconFolder = createIconComponent("folder");
export const IconFolderOpen = createIconComponent("folderOpen");
export const IconDatabase = createIconComponent("database");
export const IconDataset = createIconComponent("dataset");
export const IconUpload = createIconComponent("upload");
export const IconDownload = createIconComponent("download");
export const IconArchive = createIconComponent("archive");

// Media & Communication
export const IconMic = createIconComponent("mic");
export const IconMicOff = createIconComponent("micOff");
export const IconVideo = createIconComponent("video");
export const IconVideoOff = createIconComponent("videoOff");
export const IconCamera = createIconComponent("camera");
export const IconVolume = createIconComponent("volume");
export const IconVolumeOff = createIconComponent("volumeOff");
export const IconPlay = createIconComponent("play");
export const IconPause = createIconComponent("pause");
export const IconStop = createIconComponent("stop");
export const IconRecord = createIconComponent("record");
export const IconImage = createIconComponent("image");

// Users & Collaboration
export const IconUser = createIconComponent("user");
export const IconUsers = createIconComponent("users");
export const IconUserPlus = createIconComponent("userPlus");
export const IconShare = createIconComponent("share");
export const IconChat = createIconComponent("chat");
export const IconComment = createIconComponent("comment");
export const IconSend = createIconComponent("send");
export const IconBell = createIconComponent("bell");

// UI & Layout
export const IconMenu = createIconComponent("menu");
export const IconMoreHorizontal = createIconComponent("moreHorizontal");
export const IconMoreVertical = createIconComponent("moreVertical");
export const IconGrid = createIconComponent("grid");
export const IconList = createIconComponent("list");
export const IconLayout = createIconComponent("layout");
export const IconDashboard = createIconComponent("dashboard");
export const IconGripHorizontal = createIconComponent("gripHorizontal");
export const IconGripVertical = createIconComponent("gripVertical");
export const IconDragHandle = createIconComponent("dragHorizontal");

// Status & Feedback
export const IconInfo = createIconComponent("info");
export const IconWarning = createIconComponent("warning");
export const IconError = createIconComponent("error");
export const IconSuccess = createIconComponent("success");
export const IconHelp = createIconComponent("help");
export const IconLoader = createIconComponent("loader");
export const IconDot = createIconComponent("dot");

// Science & Domain
export const IconBiotech = createIconComponent("biotech");
export const IconScience = createIconComponent("science");
export const IconAtom = createIconComponent("atom");
export const IconBrain = createIconComponent("brain");
export const IconDna = createIconComponent("dna");
export const IconHeart = createIconComponent("heart");
export const IconChart = createIconComponent("chart");
export const IconGraph = createIconComponent("graph");
export const IconScatterChart = createIconComponent("scatterChart");

// Navigation & Location
export const IconCompass = createIconComponent("compass");
export const IconHome = createIconComponent("home");
export const IconMap = createIconComponent("map");
export const IconLocation = createIconComponent("location");
export const IconGlobe = createIconComponent("globe");
export const IconNavigation = createIconComponent("navigation");

// Time & Scheduling
export const IconClock = createIconComponent("clock");
export const IconCalendar = createIconComponent("calendar");

// Security & Access
export const IconLock = createIconComponent("lock");
export const IconUnlock = createIconComponent("unlock");
export const IconShield = createIconComponent("shield");
export const IconKey = createIconComponent("key");

// Bookmarks & Favorites
export const IconBookmark = createIconComponent("bookmark");
export const IconStar = createIconComponent("star");
export const IconStarOutline = createIconComponent("starOutline");
export const IconPin = createIconComponent("pin");

// Links & External
export const IconLink = createIconComponent("link");
export const IconLinkOff = createIconComponent("linkOff");
export const IconExternalLink = createIconComponent("externalLink");
export const IconLogout = createIconComponent("logout");
export const IconLogin = createIconComponent("login");

// Devices & Hardware
export const IconKeyboard = createIconComponent("keyboard");
export const IconMonitor = createIconComponent("monitor");
export const IconDesktop = createIconComponent("desktop");
export const IconHeadphones = createIconComponent("headphones");
export const IconHeadset = createIconComponent("headset");
export const IconHeadsetMic = createIconComponent("headsetMic");
export const IconTerminal = createIconComponent("terminal");
export const IconCode = createIconComponent("terminal");
export const IconCpu = createIconComponent("cpu");
export const IconMemory = createIconComponent("memory");

// Toggles & Modes
export const IconSun = createIconComponent("sun");
export const IconMoon = createIconComponent("moon");

// Misc
export const IconZap = createIconComponent("zap");
export const IconRocket = createIconComponent("rocket");
export const IconCompare = createIconComponent("compare");
export const IconMerge = createIconComponent("merge");
export const IconGitBranch = createIconComponent("gitBranch");
