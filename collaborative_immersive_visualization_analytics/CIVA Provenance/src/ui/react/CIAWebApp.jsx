// src/ui/react/CIAWebApp.jsx
// =============================================================================
// MAIN APPLICATION COMPONENT - CANVAS-CENTRIC VERSION
// =============================================================================
//
// Canvas chrome (CanvasHeader, CanvasToolbar, CanvasStatusBar) is embedded
// in CanvasWorkspace. ThreeEdgeLayout has 3 rows:
// - Top bar (Header)
// - Main content (activity bars + panels + workspace)
// - Bottom bar (StatusBar)

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ui as log } from "@Utils/logger.js";
import {
  initializePhase3,
  getViewConfigurationManager,
  getDatasetManager,
} from "@Init/appInitializer.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { authService } from "@Services/authService.js";
import { provenanceService } from "@Services/provenanceService.js";
import { recordingCaptureService } from "@Services/recordingCaptureService.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

// =============================================================================
// LAYOUT INFRASTRUCTURE
// =============================================================================
import { ThreeEdgeLayout } from "@UI/react/components/layout/ThreeEdgeLayout";

// =============================================================================
// HEADER COMPONENTS (48px - Global App Controls)
// =============================================================================
import { Header } from "@UI/react/components/layout/Header";
import { RoomHeader } from "@UI/react/components/organisms/RoomHeader";
import { WorkspaceBar } from "@UI/react/components/organisms/WorkspaceBar";

// =============================================================================
// FOOTER / STATUS BAR (28px - System Status)
// =============================================================================
import { StatusBar } from "@UI/react/components/layout/StatusBar";
import { ConfirmationDialog } from "@UI/react/components/modals/ConfirmationDialog";

// =============================================================================
// WORKSPACE & CANVAS
// =============================================================================
import { CanvasWorkspace } from "@UI/react/components/workspace";

// =============================================================================
// PANEL COMPONENTS (Separated Activity Bars and Content)
// =============================================================================
import {
  LeftPanelProvider,
  LeftActivityBar,
  LeftPanelContent,
} from "@UI/react/components/panels/LeftPanel";
import {
  RightPanelProvider,
  RightActivityBar,
  RightPanelContent,
} from "@UI/react/components/panels/RightPanel";
import {
  FloatingPanelProvider,
  AllFloatingPanels,
  useInstanceToolsFloating,
} from "@UI/react/components/panels/FloatingPanel";
import { PanelShellProvider } from "@UI/react/components/panels/PanelShell";
import { UnifiedCompanionPanelShell } from "@UI/react/components/panels/CompanionPanel";
import { CanvasMapPanel } from "@UI/react/components/panels/CanvasMapPanel";
import { VGEditorPanelManager } from "@UI/react/components/panels/VGEditor";
import { LayoutPanelProvider } from "@UI/react/components/panels/LayoutPanel/LayoutPanelContext";
import { FloatingCanvasNavigator, useNavigatorButton } from "@UI/react/components/panels/LayoutPanel";
import { CanvasOperationsPanel } from "@UI/react/components/panels/FloatingPanel/CanvasOperationsPanel";
import { VRAccessibilityProvider } from "@UI/react/context/VRAccessibilityContext";
import { AdaptiveProvider, useAdaptive } from "@UI/react/context/AdaptiveContext";
import { CanvasMapProvider, VGEditorProvider } from "@UI/react/context";
import { VRWristMenuProvider } from "@UI/react/components/organisms/VRWristMenu";
import { VRWristMenu } from "@UI/react/components/organisms/VRWristMenu";

// =============================================================================
// MODALS
// =============================================================================
import { CreateRoomModal } from "@UI/react/components/modals/CreateRoomModal";
import { KeyboardShortcutsModal } from "@UI/react/components/modals/KeyboardShortcutsModal";
import { GlobalSearchModal } from "@UI/react/components/modals/GlobalSearchModal";
import { DeleteViewDialog } from "@UI/react/components/modals/confirmations/DeleteViewDialog";
import { DatasetSelectorModal } from "@UI/react/components/modals/DatasetSelectorModal";

// =============================================================================
// TOAST NOTIFICATIONS
// =============================================================================
import { ToastContainer } from "@UI/react/components/molecules/Toast";
import { toast } from "@UI/react/store/toastStore";

// =============================================================================
// CANVAS HISTORY (UNDO/REDO)
// =============================================================================
import { canvasHistory } from "@UI/react/store/canvasHistoryStore";

// =============================================================================
// HOOKS
// =============================================================================
import { useWorkspaces } from "@UI/react/hooks/useWorkspaces.js";
import { useCanvas } from "@UI/react/hooks/useCanvas.js";
import { useRoomWorkspaceTransition } from "@UI/react/hooks/useRoomWorkspaceTransition.js";
import {
  VIEW_MODES,
  useWebXRAvailability,
  useViewModeKeyboardShortcut,
  useGlobalKeyboardShortcuts,
  LAYOUT_MODES,
} from "@UI/react/components/organisms";
import { useVoiceControls } from "@UI/react/hooks/useVoiceBar.js";
import { useRoomIndicator } from "@UI/react/hooks/useRoomIndicator.js";
import { useWorkspacePreferences } from "@UI/react/hooks/useWorkspacePreferences.js";

// =============================================================================
// CENTRALIZED STATE MODULES
// =============================================================================
import {
  loadCanvasSize,
  saveCanvasSize,
} from "@UI/react/hooks/canvasState.js";

// Helper to get initial canvas size
const getInitialCanvasSize = () => {
  const saved = loadCanvasSize();
  return saved ?? { rows: 3, cols: 3 };
};

function getDemoDatasetRequest() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const rawValue = params.get("demoDataset") || params.get("demoScene");
  if (!rawValue) return null;

  const normalized =
    rawValue === "1" || rawValue === "true" ? "Bones.vtp" : rawValue;
  const filename = normalized.toLowerCase().endsWith(".vtp")
    ? normalized
    : `${normalized}.vtp`;

  return {
    filename,
    autoOpen: params.get("demoOpen") !== "0",
  };
}

function isDemoScreenshotMode() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    getDemoDatasetRequest() !== null ||
    ["1", "true", "yes"].includes(params.get("demoPeople") || "")
  );
}

// =============================================================================
// MAIN APPLICATION COMPONENT
// =============================================================================

export function CIAWebApp({ username, userId, projectId }) {
  const { isVR } = useAdaptive();
  const demoDatasetLoadedRef = useRef(false);
  // ===========================================================================
  // PHASE 3 INITIALIZATION
  // ===========================================================================
  const [phase3Status, setPhase3Status] = useState("pending");
  const phase3Started = useRef(false);

  useEffect(() => {
    if (phase3Started.current) return;
    phase3Started.current = true;

    const initPhase3 = async () => {
      try {
        setPhase3Status("loading");
        await initializePhase3();
        setPhase3Status("ready");
        log.info("Phase 3 initialization complete");
      } catch (error) {
        log.error("Phase 3 initialization failed:", error);
        setPhase3Status("error");
      }
    };

    initPhase3();
  }, []);

  useEffect(() => {
    recordingCaptureService.initialize();

    return () => {
      recordingCaptureService.destroy();
    };
  }, []);

  const [workspaceRoomId, setWorkspaceRoomId] = useState(null);

  // ===========================================================================
  // WORKSPACE STATE
  // ===========================================================================
  const resolvedWorkspaceRoomId = useMemo(() => {
    return (
      workspaceRoomId
      || currentRoomId
      || sessionManager.getRoomId?.()
      || null
    );
  }, [currentRoomId, workspaceRoomId]);

  const {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    isLoading: workspacesLoading,
    selectWorkspace,
    clearActiveWorkspace,
    createProjectWorkspace,
    createPersonalWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspaces({ userId, projectId, roomId: resolvedWorkspaceRoomId });

  const [workspaceOrder, setWorkspaceOrder] = useState([]);
  const [openWorkspaceIds, setOpenWorkspaceIds] = useState([]);
  const [showCloseAllTabsConfirm, setShowCloseAllTabsConfirm] = useState(false);
  const [skipCloseAllTabsConfirm, setSkipCloseAllTabsConfirm] = useState(false);
  const workspaceTabsLoadedRef = useRef(false);

  useEffect(() => {
    if (!isDemoScreenshotMode()) return;
    if (workspacesLoading || currentWorkspaceId) return;

    const ensureDemoWorkspace = async () => {
      try {
        const preferredWorkspace = workspaces.find((ws) => ws.name === "My Workspace");
        if (preferredWorkspace?.id) {
          selectWorkspace(preferredWorkspace.id);
          return;
        }

        const fallbackWorkspace = workspaces[0];
        if (fallbackWorkspace?.id) {
          selectWorkspace(fallbackWorkspace.id);
          return;
        }

        if (createPersonalWorkspace) {
          const created = await createPersonalWorkspace("My Workspace");
          if (created?.id) {
            selectWorkspace(created.id);
          }
        }
      } catch (error) {
        log.warn("Failed to auto-open demo workspace:", error);
      }
    };

    ensureDemoWorkspace();
  }, [
    currentWorkspaceId,
    createPersonalWorkspace,
    selectWorkspace,
    workspaces,
    workspacesLoading,
  ]);

  useEffect(() => {
    const request = getDemoDatasetRequest();
    if (!request || demoDatasetLoadedRef.current) return;

    const loadDemoDataset = async () => {
      try {
        const datasetManager = getDatasetManager();
        if (!datasetManager) return;

        demoDatasetLoadedRef.current = true;

        const sourceUrl = `/vtp_files/${request.filename}`;
        const demoDatasetId = `demo-${request.filename
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}`;

        let datasetId = demoDatasetId;
        const existingDataset = datasetManager.getDataset?.(demoDatasetId);

        if (!existingDataset) {
          const response = await fetch(sourceUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch demo dataset: ${response.status}`);
          }

          const blob = await response.blob();
          const file = new File([blob], request.filename, {
            type: "application/vnd.vtk.polydata+xml",
          });

          datasetId = await datasetManager.loadDataset(file, sourceUrl, {
            serverId: demoDatasetId,
            serverMetadata: {
              uploadedBy: "demo-user",
              uploadedAt: Date.now(),
              source: "demo-local",
              publicPath: sourceUrl,
            },
          });
        }

        if (request.autoOpen && currentWorkspaceId) {
          try {
            await viewLifecycleService.createAndPlaceView(
              datasetId,
              {},
              {
                name: request.filename.replace(/\.vtp$/i, ""),
                instanceType: "vtk",
              }
            );
          } catch (viewError) {
            log.warn("Demo dataset loaded but view creation failed:", viewError);
          }
        }

        toast.info(`Demo dataset ready: ${request.filename}`);
      } catch (error) {
        demoDatasetLoadedRef.current = false;
        log.error("Failed to load demo dataset:", error);
        toast.error(`Demo dataset failed: ${error.message}`);
      }
    };

    loadDemoDataset();
  }, [currentWorkspaceId]);

  // ===========================================================================
  // SERVER-SIDE PREFERENCES (persisted per-user, per-project)
  // ===========================================================================
  const {
    preferences: serverPreferences,
    hasLoaded: serverPrefsLoaded,
    setViewMode: setServerViewMode,
    setOpenWorkspaceIds: setServerOpenWorkspaceIds,
    setActiveWorkspaceId: setServerActiveWorkspaceId,
    setWorkspaceOrder: setServerWorkspaceOrder,
    setWindowPosition: setServerWindowPosition,
    setWindowSize: setServerWindowSize,
    setViewportPosition: setServerViewportPosition,
    setTileMaximizedWorkspaceId: setServerTileMaximizedId,
    updatePreferences: updateServerPreferences,
  } = useWorkspacePreferences(projectId);

  const serverPrefsSyncedRef = useRef(false);
  const workspaceTabsMigratedRef = useRef(false);
  const closeAllTabsMigratedRef = useRef(false);
  const canvasModeMigratedRef = useRef(false);
  const workspaceTabsDefaultKey = useMemo(() => {
    const resolvedUserId =
      userId || sessionManager.getUserId?.() || "anonymous";
    if (!resolvedUserId) return null;
    const projectScope = projectId || "default";
    return `cia:workspace-tabs:${resolvedUserId}:${projectScope}:default`;
  }, [projectId, userId]);
  const workspaceTabsStorageKey = useMemo(() => {
    const resolvedUserId =
      userId || sessionManager.getUserId?.() || "anonymous";
    if (!resolvedUserId || !resolvedWorkspaceRoomId) return null;
    const projectScope = projectId || "default";
    return `cia:workspace-tabs:${resolvedUserId}:${projectScope}:${resolvedWorkspaceRoomId}`;
  }, [projectId, resolvedWorkspaceRoomId, userId]);
  const closeAllTabsDefaultKey = useMemo(() => {
    const resolvedUserId =
      userId || sessionManager.getUserId?.() || "anonymous";
    if (!resolvedUserId) return null;
    const projectScope = projectId || "default";
    return `cia:close-all-tabs-confirm:${resolvedUserId}:${projectScope}:default`;
  }, [projectId, userId]);
  const closeAllTabsStorageKey = useMemo(() => {
    const resolvedUserId =
      userId || sessionManager.getUserId?.() || "anonymous";
    if (!resolvedUserId || !resolvedWorkspaceRoomId) return null;
    const projectScope = projectId || "default";
    return `cia:close-all-tabs-confirm:${resolvedUserId}:${projectScope}:${resolvedWorkspaceRoomId}`;
  }, [projectId, resolvedWorkspaceRoomId, userId]);

  const ensureCanvasForWorkspace = useCallback(
    async (workspaceId) => {
      if (!workspaceId) return null;
      const workspace = (workspaces || []).find((ws) => ws.id === workspaceId);
      if (!workspace) return null;
      if (workspace.activeCanvasId) return workspace.activeCanvasId;
      if (workspace.canvasIds && workspace.canvasIds.length > 0) {
        const nextCanvasId = workspace.canvasIds[0];
        await updateWorkspace?.(workspace.id, { activeCanvasId: nextCanvasId });
        return nextCanvasId;
      }

      try {
        setEnsuringWorkspaceIds((prev) => ({
          ...prev,
          [workspaceId]: true,
        }));
        const { canvasManager } = await import(
          "@Core/data/managers/CanvasManager.js"
        );
        const { workspaceManager } = await import(
          "@Core/data/managers/WorkspaceManager.js"
        );

        const ownership =
          workspace.type === "personal"
            ? { type: "personal", ownerId: userId || "anonymous" }
            : { type: "project", ownerId: projectId || workspace.projectId };

        const canvas = await canvasManager.createCanvas(
          projectId || workspace.projectId || null,
          {
            name: workspace.name || "Workspace",
            ownership,
            workspaceId: workspace.id,
            projectId: projectId || workspace.projectId || null,
          }
        );

        await workspaceManager.addCanvasToWorkspace(workspace.id, canvas.id);
        await updateWorkspace?.(workspace.id, {
          activeCanvasId: canvas.id,
        });

        return canvas.id;
      } catch (err) {
        log.error("Failed to create canvas for workspace:", err);
        return null;
      } finally {
        setEnsuringWorkspaceIds((prev) => {
          if (!prev[workspaceId]) return prev;
          const next = { ...prev };
          delete next[workspaceId];
          return next;
        });
      }
    },
    [projectId, updateWorkspace, userId, workspaces]
  );

  useEffect(() => {
    if (!workspaces || workspaces.length === 0) return;
    if (!openWorkspaceIds.length && !currentWorkspaceId) return;

    const targets = new Set(openWorkspaceIds || []);
    if (currentWorkspaceId) {
      targets.add(currentWorkspaceId);
    }

    targets.forEach((workspaceId) => {
      ensureCanvasForWorkspace(workspaceId);
    });
  }, [
    currentWorkspaceId,
    ensureCanvasForWorkspace,
    openWorkspaceIds,
    workspaces,
  ]);

  useEffect(() => {
    if (!workspaces || workspaces.length === 0) {
      setWorkspaceOrder([]);
      setOpenWorkspaceIds([]);
      return;
    }

    const ids = workspaces.map((ws) => ws.id);
    const mergeOrder = (list = []) => {
      const next = list.filter((id) => ids.includes(id));
      ids.forEach((id) => {
        if (!next.includes(id)) {
          next.push(id);
        }
      });
      return next;
    };
    const mergeOpen = (list = [], allowEmpty = false) => {
      const normalized = Array.isArray(list)
        ? list.filter((id) => ids.includes(id))
        : [];
      const hasList = normalized.length > 0;
      const next = !allowEmpty && !hasList ? [...ids] : [...normalized];
      if (
        currentWorkspaceId &&
        ids.includes(currentWorkspaceId) &&
        !next.includes(currentWorkspaceId)
      ) {
        if (!allowEmpty || hasList) {
          next.push(currentWorkspaceId);
        }
      }
      return next;
    };

    if (!workspaceTabsLoadedRef.current && workspaceTabsStorageKey) {
      try {
        const raw = window.localStorage.getItem(workspaceTabsStorageKey);
        if (raw) {
          const saved = JSON.parse(raw);
          setWorkspaceOrder(mergeOrder(saved?.order || []));
          setOpenWorkspaceIds(mergeOpen(saved?.openIds || [], true));
          workspaceTabsLoadedRef.current = true;
          return;
        }
      } catch (err) {
        log.debug("Workspace tabs localStorage read failed:", err);
      }
    }

    const allowEmpty = workspaceTabsLoadedRef.current;
    workspaceTabsLoadedRef.current = true;
    setWorkspaceOrder((prev) => mergeOrder(prev));
    setOpenWorkspaceIds((prev) => mergeOpen(prev, allowEmpty));
  }, [workspaces, currentWorkspaceId, workspaceTabsStorageKey]);

  useEffect(() => {
    if (!workspaceTabsStorageKey) return;
    workspaceTabsLoadedRef.current = false;
  }, [workspaceTabsStorageKey]);

  useEffect(() => {
    if (!workspaceTabsStorageKey || !workspaceTabsLoadedRef.current) return;
    try {
      window.localStorage.setItem(
        workspaceTabsStorageKey,
        JSON.stringify({
          order: workspaceOrder,
          openIds: openWorkspaceIds,
          activeId: currentWorkspaceId,
        })
      );
    } catch (err) {
      log.debug("Workspace tabs localStorage write failed:", err);
    }
  }, [
    workspaceTabsStorageKey,
    workspaceOrder,
    openWorkspaceIds,
    currentWorkspaceId,
  ]);

  const handleOpenWorkspace = useCallback(
    async (workspaceId) => {
      if (!workspaceId) return;
      setOpenWorkspaceIds((prev) =>
        prev.includes(workspaceId) ? prev : [...prev, workspaceId]
      );
      await ensureCanvasForWorkspace(workspaceId);
      selectWorkspace(workspaceId);
    },
    [ensureCanvasForWorkspace, selectWorkspace]
  );

  const handleCreateWorkspace = useCallback(async (type = "empty") => {
    const nextIndex = (workspaces?.length || 0) + 1;
    const typeNames = {
      empty: `Workspace ${nextIndex}`,
      subset: `Subset ${nextIndex}`,
      scratch: `Scratch Pad ${nextIndex}`,
    };
    const name = typeNames[type] || `Workspace ${nextIndex}`;

    if (type === "scratch") {
      const personal = (workspaces || []).find((ws) => ws.type === "personal");
      if (personal?.id) {
        await ensureCanvasForWorkspace(personal.id);
        handleOpenWorkspace(personal.id);
        return;
      }
      if (!createPersonalWorkspace) return;
      const createdPersonal = await createPersonalWorkspace(name);
      if (createdPersonal?.id) {
        await ensureCanvasForWorkspace(createdPersonal.id);
        handleOpenWorkspace(createdPersonal.id);
      }
      return;
    }

    if (!createProjectWorkspace) return;
    const created = await createProjectWorkspace(name, "");
    if (created?.id) {
      await ensureCanvasForWorkspace(created.id);
      handleOpenWorkspace(created.id);
    }
  }, [
    createPersonalWorkspace,
    createProjectWorkspace,
    ensureCanvasForWorkspace,
    handleOpenWorkspace,
    workspaces,
  ]);

  const handleWorkspaceChange = useCallback(
    (nextWorkspaceId) => {
      handleOpenWorkspace(nextWorkspaceId);
    },
    [handleOpenWorkspace]
  );

  useEffect(() => {
    if (currentWorkspaceId) {
      ensureCanvasForWorkspace(currentWorkspaceId);
    }
  }, [currentWorkspaceId, ensureCanvasForWorkspace]);

  const handleCloseWorkspace = useCallback(
    (workspaceId) => {
      if (!workspaceId) return;
      setOpenWorkspaceIds((prev) => {
        const next = prev.filter((id) => id !== workspaceId);
        if (currentWorkspaceId === workspaceId) {
          const nextActive = next[0];
          if (nextActive) {
            selectWorkspace(nextActive);
          } else {
            clearActiveWorkspace?.();
          }
        }
        return next;
      });
    },
    [clearActiveWorkspace, currentWorkspaceId, selectWorkspace]
  );

  const handleConfirmCloseAllTabs = useCallback(() => {
    setOpenWorkspaceIds([]);
    clearActiveWorkspace?.();
    setShowCloseAllTabsConfirm(false);
  }, [clearActiveWorkspace]);

  const handleRequestCloseAllTabs = useCallback(() => {
    if (!openWorkspaceIds.length) return;
    if (skipCloseAllTabsConfirm) {
      handleConfirmCloseAllTabs();
      return;
    }
    setShowCloseAllTabsConfirm(true);
  }, [handleConfirmCloseAllTabs, openWorkspaceIds.length, skipCloseAllTabsConfirm]);

  const handleDeactivateWorkspace = useCallback(() => {
    clearActiveWorkspace?.();
  }, [clearActiveWorkspace]);

  const handleRenameWorkspace = useCallback(
    async (workspaceId, name) => {
      if (!workspaceId || !name?.trim()) return;
      await updateWorkspace?.(workspaceId, { name: name.trim() });
    },
    [updateWorkspace]
  );

  const handleDeleteWorkspace = useCallback(
    async (workspaceId) => {
      if (!workspaceId) return;
      // Close the tab first
      handleCloseWorkspace(workspaceId);
      // Then delete from database
      await deleteWorkspace?.(workspaceId);
    },
    [deleteWorkspace, handleCloseWorkspace]
  );

  const handleReorderWorkspaces = useCallback((draggedId, targetId) => {
    if (!draggedId || !targetId || draggedId === targetId) return;
    setWorkspaceOrder((prev) => {
      const next = prev.filter((id) => id !== draggedId);
      const targetIndex = next.indexOf(targetId);
      if (targetIndex === -1) {
        next.push(draggedId);
      } else {
        next.splice(targetIndex, 0, draggedId);
      }
      return next;
    });
  }, []);

  // ===========================================================================
  // CANVAS STATE
  // ===========================================================================
  const {
    canvas,
    canvasId,
    viewport,
    setFlowDirection: setCanvasFlowDirection,
    setCanvasSize,
    setViewportSize,
  } = useCanvas(currentWorkspace?.activeCanvasId || null);

  // Derive canvas size from actual canvas dimensions
  const canvasSize = canvas?.dimensions || { rows: 3, cols: 3 };
  // Viewport size from useCanvas hook
  const viewportSize = { rows: viewport?.rows || 3, cols: viewport?.cols || 3 };

  // Persist canvas size
  useEffect(() => {
    saveCanvasSize(canvasSize);
  }, [canvasSize]);

  // ===========================================================================
  // VIEW MODE STATE (Desktop/VR)
  // ===========================================================================
  const [viewMode, setViewMode] = useState(VIEW_MODES.DESKTOP);
  const vrAvailable = useWebXRAvailability();
  useViewModeKeyboardShortcut(setViewMode);

  // ===========================================================================
  // LAYOUT MODE STATE (Normal/Isolation/Subset)
  // ===========================================================================
  const [layoutMode, setLayoutMode] = useState(LAYOUT_MODES.NORMAL);
  const [userStatus, setUserStatus] = useState("online");

  // ===========================================================================
  // EDIT STATE (Secondary Footer)
  // ===========================================================================
  // Flow direction is derived from canvas, with local state for immediate UI feedback
  const [localFlowDirection, setLocalFlowDirection] = useState("row");
  const flowDirection = canvas?.flowDirection || localFlowDirection;
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState("select");
  const [openPopouts, setOpenPopouts] = useState([]);

  // ===========================================================================
  // VOICE CONTROLS
  // ===========================================================================
  const voice = useVoiceControls();
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // ===========================================================================
  // ROOM STATE
  // ===========================================================================
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);

  // ===========================================================================
  // USER STATUS (Presence-aware)
  // ===========================================================================
  useEffect(() => {
    const handlePresenceChange = (users) => {
      const me = users.find((user) => user.isYou);
      if (me?.status) {
        setUserStatus(me.status);
      }
    };

    const handleStatusChange = (status) => {
      if (status) {
        setUserStatus(status);
      }
    };

    const handleStatusEvent = (event) => {
      const nextStatus = event?.detail?.status;
      if (nextStatus) {
        presenceSystem.updateStatus(nextStatus);
      }
    };

    const cleanupPresence = presenceSystem.onPresenceChange(handlePresenceChange);
    const cleanupStatus = presenceSystem.onStatusChange(handleStatusChange);
    window.addEventListener("cia:user-status-change", handleStatusEvent);

    return () => {
      cleanupPresence?.();
      cleanupStatus?.();
      window.removeEventListener("cia:user-status-change", handleStatusEvent);
    };
  }, []);

  // ===========================================================================
  // MODAL STATE
  // ===========================================================================
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [deleteViewTarget, setDeleteViewTarget] = useState(null); // { id, name } or null
  const [datasetSelectorTarget, setDatasetSelectorTarget] = useState(null); // { row, col } or null

  const {
    currentRoom,
    currentRoomId,
    currentRoomName,
    availableRooms,
    roomMembers,
    isLoading: isLoadingRooms,
    switchRoom,
    createRoom,
  } = useRoomIndicator({
    projectId,
    userId,
    onRoomChange: (roomId, roomName) => {
      log.info("Room changed to:", roomName);
    },
  });

  useEffect(() => {
    setWorkspaceRoomId(currentRoomId || null);
  }, [currentRoomId]);

  // Derive voice channels from rooms
  const availableVoiceChannels = useMemo(() => {
    return (availableRooms || [])
      .filter((room) => room.hasVoice)
      .map((room) => ({
        id: room.id,
        name: room.name,
        participantCount: room.voiceParticipants?.length || 0,
      }));
  }, [availableRooms]);

  // Map rooms for RoomHeader (needs color, type, usersOnline, usersInVoice fields)
  const ROOM_COLORS = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#22d3ee', '#e879f9'];
  const roomHeaderRooms = useMemo(() => {
    return (availableRooms || []).map((room, index) => ({
      id: room.id,
      name: room.name,
      color: ROOM_COLORS[index % ROOM_COLORS.length],
      type: room.type || 'main',
      usersOnline: room.memberCount || 0,
      usersInVoice: room.voiceParticipants?.length || 0,
    }));
  }, [availableRooms]);

  // Room Header state: pinned rooms, breakouts
  const [pinnedRoomIds, setPinnedRoomIds] = useState([]);
  const [activeBreakoutId, setActiveBreakoutId] = useState(null);
  const [breakouts, setBreakouts] = useState([]);

  // Workspace Bar state: canvas mode, popouts
  // workspaces, currentWorkspaceId, and handleCreateWorkspace come from useWorkspaces hook above
  const [canvasMode, setCanvasMode] = useState('tile');
  const [popouts, setPopouts] = useState([]);
  const [ensuringWorkspaceIds, setEnsuringWorkspaceIds] = useState({});
  const [tileMaximizedWorkspaceId, setTileMaximizedWorkspaceId] = useState(null);
  const canvasModeLoadedRef = useRef(false);
  const canvasModeDefaultKey = useMemo(() => {
    const resolvedUserId =
      userId || sessionManager.getUserId?.() || "anonymous";
    if (!resolvedUserId) return null;
    const projectScope = projectId || "default";
    return `cia:canvas-mode:${resolvedUserId}:${projectScope}:default`;
  }, [projectId, userId]);
  const canvasModeStorageKey = useMemo(() => {
    const resolvedUserId =
      userId || sessionManager.getUserId?.() || "anonymous";
    if (!resolvedUserId || !resolvedWorkspaceRoomId) return null;
    const projectScope = projectId || "default";
    return `cia:canvas-mode:${resolvedUserId}:${projectScope}:${resolvedWorkspaceRoomId}`;
  }, [projectId, resolvedWorkspaceRoomId, userId]);

  useEffect(() => {
    if (!resolvedWorkspaceRoomId) return;
    if (workspaceTabsMigratedRef.current) return;
    if (!workspaceTabsStorageKey || !workspaceTabsDefaultKey) return;
    try {
      const target = window.localStorage.getItem(workspaceTabsStorageKey);
      const fallback = window.localStorage.getItem(workspaceTabsDefaultKey);
      if (!target && fallback) {
        window.localStorage.setItem(workspaceTabsStorageKey, fallback);
      }
      if (fallback) {
        window.localStorage.removeItem(workspaceTabsDefaultKey);
      }
    } catch (err) {
      log.debug("Workspace tabs localStorage migrate failed:", err);
    }
    workspaceTabsMigratedRef.current = true;
  }, [resolvedWorkspaceRoomId, workspaceTabsDefaultKey, workspaceTabsStorageKey]);

  useEffect(() => {
    if (!resolvedWorkspaceRoomId) return;
    if (closeAllTabsMigratedRef.current) return;
    if (!closeAllTabsStorageKey || !closeAllTabsDefaultKey) return;
    try {
      const target = window.localStorage.getItem(closeAllTabsStorageKey);
      const fallback = window.localStorage.getItem(closeAllTabsDefaultKey);
      if (!target && fallback) {
        window.localStorage.setItem(closeAllTabsStorageKey, fallback);
      }
      if (fallback) {
        window.localStorage.removeItem(closeAllTabsDefaultKey);
      }
    } catch (err) {
      log.debug("Close-all tabs localStorage migrate failed:", err);
    }
    closeAllTabsMigratedRef.current = true;
  }, [closeAllTabsDefaultKey, closeAllTabsStorageKey, resolvedWorkspaceRoomId]);

  useEffect(() => {
    if (!resolvedWorkspaceRoomId) return;
    if (canvasModeMigratedRef.current) return;
    if (!canvasModeStorageKey || !canvasModeDefaultKey) return;
    try {
      const target = window.localStorage.getItem(canvasModeStorageKey);
      const fallback = window.localStorage.getItem(canvasModeDefaultKey);
      if (!target && fallback) {
        window.localStorage.setItem(canvasModeStorageKey, fallback);
      }
      if (fallback) {
        window.localStorage.removeItem(canvasModeDefaultKey);
      }
    } catch (err) {
      log.debug("Canvas mode localStorage migrate failed:", err);
    }
    canvasModeMigratedRef.current = true;
  }, [canvasModeDefaultKey, canvasModeStorageKey, resolvedWorkspaceRoomId]);

  // Map workspaces for WorkspaceBar (needs usersViewing, hasChanges, etc.)
  const workspaceBarItems = useMemo(() => {
    const workspaceMap = new Map((workspaces || []).map((ws) => [ws.id, ws]));
    const orderedIds =
      workspaceOrder.length > 0
        ? workspaceOrder
        : (workspaces || []).map((ws) => ws.id);

    return orderedIds
      .map((id) => workspaceMap.get(id))
      .filter(Boolean)
      .map((ws) => {
        const typeMap = {
          project: "workspace",
          breakout: "workspace",
          personal: "scratch",
        };

        return {
          id: ws.id,
          name: ws.name || "Untitled",
          type: typeMap[ws.type] || "workspace",
          isOpen: openWorkspaceIds.includes(ws.id),
          activeCanvasId: ws.activeCanvasId,
          usersViewing: 0,
          hasChanges: false,
          hasBreakout: ws.type === "breakout",
          breakoutUsers: 0,
        };
      });
  }, [workspaces, workspaceOrder, openWorkspaceIds]);

  const openWorkspaceNames = useMemo(() => {
    const workspaceMap = new Map((workspaces || []).map((ws) => [ws.id, ws]));
    return openWorkspaceIds
      .map((id) => workspaceMap.get(id))
      .filter(Boolean)
      .map((workspace) => workspace.name || "Untitled Workspace");
  }, [openWorkspaceIds, workspaces]);

  useEffect(() => {
    if (!canvasModeStorageKey) return;
    canvasModeLoadedRef.current = false;
    try {
      const stored = window.localStorage.getItem(canvasModeStorageKey);
      if (stored === "tabs" || stored === "tile") {
        setCanvasMode(stored);
      } else {
        setCanvasMode("tile");
      }
    } catch (err) {
      log.debug("Canvas mode localStorage read failed:", err);
    }
    canvasModeLoadedRef.current = true;
  }, [canvasModeStorageKey]);


  useEffect(() => {
    if (!canvasModeStorageKey || !canvasModeLoadedRef.current) return;
    try {
      window.localStorage.setItem(canvasModeStorageKey, canvasMode);
    } catch (err) {
      log.debug("Canvas mode localStorage write failed:", err);
    }
  }, [canvasMode, canvasModeStorageKey]);

  // ===========================================================================
  // SERVER PREFERENCES SYNC
  // ===========================================================================
  // Initialize from server preferences when they load (if no localStorage data)
  useEffect(() => {
    if (!serverPrefsLoaded || serverPrefsSyncedRef.current) return;
    serverPrefsSyncedRef.current = true;

    // Only apply server preferences if we have them and localStorage is empty
    if (!serverPreferences || Object.keys(serverPreferences).length === 0) {
      return;
    }

    log.debug('[Preferences] Applying server preferences:', serverPreferences);

    // Apply viewMode from server if localStorage hasn't set it
    if (serverPreferences.viewMode && !canvasModeLoadedRef.current) {
      setCanvasMode(serverPreferences.viewMode);
    }

    // Apply workspace state from server if localStorage hasn't set it
    if (!workspaceTabsLoadedRef.current) {
      if (serverPreferences.openWorkspaceIds?.length > 0) {
        setOpenWorkspaceIds(serverPreferences.openWorkspaceIds);
      }
      if (serverPreferences.workspaceOrder?.length > 0) {
        setWorkspaceOrder(serverPreferences.workspaceOrder);
      }
      if (serverPreferences.activeWorkspaceId) {
        selectWorkspace(serverPreferences.activeWorkspaceId);
      }
    }
  }, [serverPrefsLoaded, serverPreferences, selectWorkspace]);

  // Sync state changes to server (debounced by the hook)
  useEffect(() => {
    if (!serverPrefsLoaded || !serverPrefsSyncedRef.current) return;

    // Sync viewMode
    setServerViewMode?.(canvasMode);
  }, [canvasMode, serverPrefsLoaded, setServerViewMode]);

  useEffect(() => {
    if (!serverPrefsLoaded || !serverPrefsSyncedRef.current) return;

    // Sync workspace state
    setServerOpenWorkspaceIds?.(openWorkspaceIds);
  }, [openWorkspaceIds, serverPrefsLoaded, setServerOpenWorkspaceIds]);

  useEffect(() => {
    if (!serverPrefsLoaded || !serverPrefsSyncedRef.current) return;

    setServerActiveWorkspaceId?.(currentWorkspaceId);
  }, [currentWorkspaceId, serverPrefsLoaded, setServerActiveWorkspaceId]);

  useEffect(() => {
    if (!serverPrefsLoaded || !serverPrefsSyncedRef.current) return;

    setServerWorkspaceOrder?.(workspaceOrder);
  }, [workspaceOrder, serverPrefsLoaded, setServerWorkspaceOrder]);

  useEffect(() => {
    if (!serverPrefsLoaded || !serverPrefsSyncedRef.current) return;

    setServerTileMaximizedId?.(tileMaximizedWorkspaceId);
  }, [tileMaximizedWorkspaceId, serverPrefsLoaded, setServerTileMaximizedId]);

  // Initialize tileMaximizedWorkspaceId from server preferences
  useEffect(() => {
    if (!serverPrefsLoaded || !serverPrefsSyncedRef.current) return;
    if (serverPreferences?.tileMaximizedWorkspaceId && !tileMaximizedWorkspaceId) {
      setTileMaximizedWorkspaceId(serverPreferences.tileMaximizedWorkspaceId);
    }
  }, [serverPrefsLoaded, serverPreferences?.tileMaximizedWorkspaceId, tileMaximizedWorkspaceId]);

  // Callbacks for persisting window/viewport positions (for floating windows)
  const handleWindowPositionChange = useCallback((workspaceId, position) => {
    if (serverPrefsLoaded) {
      setServerWindowPosition?.(workspaceId, position);
    }
  }, [serverPrefsLoaded, setServerWindowPosition]);

  const handleWindowSizeChange = useCallback((workspaceId, size) => {
    if (serverPrefsLoaded) {
      setServerWindowSize?.(workspaceId, size);
    }
  }, [serverPrefsLoaded, setServerWindowSize]);

  const handleViewportPositionChange = useCallback((canvasId, position) => {
    if (serverPrefsLoaded) {
      setServerViewportPosition?.(canvasId, position);
    }
  }, [serverPrefsLoaded, setServerViewportPosition]);

  useEffect(() => {
    if (!closeAllTabsStorageKey) return;
    try {
      const stored = window.localStorage.getItem(closeAllTabsStorageKey);
      setSkipCloseAllTabsConfirm(stored === "1");
    } catch (err) {
      log.debug("Close-all tabs localStorage read failed:", err);
    }
  }, [closeAllTabsStorageKey]);

  useEffect(() => {
    if (!closeAllTabsStorageKey) return;
    try {
      window.localStorage.setItem(
        closeAllTabsStorageKey,
        skipCloseAllTabsConfirm ? "1" : "0"
      );
    } catch (err) {
      log.debug("Close-all tabs localStorage write failed:", err);
    }
  }, [closeAllTabsStorageKey, skipCloseAllTabsConfirm]);

  // Derive voice room ID (voice.currentRoom is a name; match to room ID)
  const voiceRoomId = useMemo(() => {
    if (!voice.inVoice) return null;
    // If voice is connected but no explicit channel, assume current room
    return currentRoomId || null;
  }, [voice.inVoice, currentRoomId]);

  // ===========================================================================
  // CALLBACKS - HEADER
  // ===========================================================================
  const handleOpenSearch = useCallback(() => {
    log.debug("Open global search");
    setShowGlobalSearch(true);
  }, []);

  const handleOpenHelp = useCallback(() => {
    log.debug("Open keyboard shortcuts");
    setShowKeyboardShortcuts(true);
  }, []);

  const handleDeleteView = useCallback((view) => {
    log.debug("Delete view requested:", view);
    setDeleteViewTarget(view);
  }, []);

  const handleConfirmDeleteView = useCallback(async () => {
    if (!deleteViewTarget?.id) return;

    const viewId = deleteViewTarget.id;
    const viewName = deleteViewTarget.name;
    log.info("Deleting view:", viewName);

    try {
      // Get managers
      const viewConfigManager = getViewConfigurationManager();
      const { canvasManager } = await import('@Core/data/managers/CanvasManager.js');

      // Find and store placement info for undo
      const placement = canvasManager.getPlacementForView(viewId);
      const placementData = placement ? {
        canvasId: canvasManager.getActiveCanvas()?.id,
        row: placement.row,
        col: placement.col,
        rowSpan: placement.rowSpan || 1,
        colSpan: placement.colSpan || 1,
      } : null;

      // Store view config for potential undo
      const viewConfig = viewConfigManager.getView(viewId);

      // 1. Remove from canvas if placed
      if (placement && placementData?.canvasId) {
        await canvasManager.removePlacement(placementData.canvasId, placement.id);
      }

      // 2. Delete the view configuration
      await viewConfigManager.deleteView(viewId);

      // 3. Record in history for undo
      canvasHistory.record({
        type: 'DELETE',
        description: `Delete "${viewName}"`,
        undo: async () => {
          // Restore would require recreating the view - complex operation
          // For now, just show a message that undo isn't fully supported for delete
          toast.warning('View deletion cannot be fully undone. Check trash to restore.');
        },
        redo: async () => {
          // Re-delete would require the view to exist again
          toast.info('Redo delete not available');
        },
      });

      toast.success(`Deleted "${viewName}"`, {
        actionLabel: 'Undo',
        onAction: () => canvasHistory.undo(),
      });
    } catch (error) {
      log.error("Failed to delete view:", error);
      toast.error(`Failed to delete view: ${error.message}`);
    }

    setDeleteViewTarget(null);
  }, [deleteViewTarget]);

  const handleSignOut = useCallback(async () => {
    log.debug("Sign out");
    presenceSystem.destroy();
    sessionManager.clearSession();
    await authService.logout();
  }, []);

  const handleProjectChange = useCallback((project) => {
    log.debug("Project changed:", project);
  }, []);

  const handleCreateProject = useCallback(() => {
    log.debug("Create project");
  }, []);

  const handleNotificationClick = useCallback((notification) => {
    log.debug("Notification clicked:", notification);
  }, []);

  // ===========================================================================
  // CALLBACKS - SECONDARY HEADER (View Mode)
  // ===========================================================================
  const handleViewModeChange = useCallback((mode) => {
    setLayoutMode(mode);
  }, []);

  // ===========================================================================
  // CALLBACKS - SECONDARY HEADER (Room)
  // ===========================================================================
  const handleRoomSelect = useCallback((roomId) => {
    switchRoom(roomId);
  }, [switchRoom]);

  const handleOpenRoomsPanel = useCallback(() => {
    window.dispatchEvent(new CustomEvent("navigate:right-panel", { detail: { tab: "rooms" } }));
  }, []);

  const handleCreateRoom = useCallback(() => {
    setShowCreateRoomModal(true);
  }, []);

  const handleTogglePin = useCallback((roomId) => {
    setPinnedRoomIds(prev => {
      if (prev.includes(roomId)) {
        return prev.filter(id => id !== roomId);
      }
      if (prev.length < 4) {
        return [...prev, roomId];
      }
      return prev;
    });
  }, []);

  const handleJoinBreakout = useCallback((breakoutId) => {
    setActiveBreakoutId(breakoutId);
  }, []);

  // ===========================================================================
  // CALLBACKS - SECONDARY FOOTER (Edit Tools)
  // ===========================================================================
  const handleToolChange = useCallback((tool) => {
    setActiveTool(tool);
    // Dispatch event for canvas to listen to
    window.dispatchEvent(new CustomEvent('canvas:toolChange', { detail: { tool } }));
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      const newMode = !prev;
      // Dispatch event for canvas to listen to
      window.dispatchEvent(new CustomEvent('canvas:editModeChange', { detail: { editMode: newMode } }));
      return newMode;
    });
  }, []);

  const handleFlowDirectionChange = useCallback((direction) => {
    // Update local state for immediate UI feedback
    setLocalFlowDirection(direction);
    // Update canvas (persists to server)
    setCanvasFlowDirection?.(direction);
  }, [setCanvasFlowDirection]);

  const handleCanvasSizeChange = useCallback((newSize) => {
    // Update canvas dimensions (persists to server)
    setCanvasSize?.(newSize);
    // Save to local storage for persistence
    saveCanvasSize(newSize);
  }, [setCanvasSize]);

  const handleViewportSizeChange = useCallback((newSize) => {
    // Validate input to prevent NaN propagation
    const rows = typeof newSize?.rows === 'number' && !isNaN(newSize.rows) ? newSize.rows : null;
    const cols = typeof newSize?.cols === 'number' && !isNaN(newSize.cols) ? newSize.cols : null;

    if (rows !== null && cols !== null) {
      // Update viewport size (how many cells are visible)
      setViewportSize?.(rows, cols);
    }
  }, [setViewportSize]);

  const handleUndo = useCallback(() => {
    if (canvasHistory.canUndo()) {
      log.debug("Undo triggered");
      canvasHistory.undo();
    } else {
      log.debug("Nothing to undo");
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (canvasHistory.canRedo()) {
      log.debug("Redo triggered");
      canvasHistory.redo();
    } else {
      log.debug("Nothing to redo");
    }
  }, []);

  const handleTogglePopout = useCallback((popoutId) => {
    setOpenPopouts((prev) => {
      const newState = prev.includes(popoutId)
        ? prev.filter((id) => id !== popoutId)
        : [...prev, popoutId];

      // Dispatch state change event for activity bar buttons
      window.dispatchEvent(new CustomEvent('cia:popout-state-change', {
        detail: { popoutId, isOpen: newState.includes(popoutId) }
      }));

      return newState;
    });
  }, []);

  // Listen for popout toggle events from activity bar
  useEffect(() => {
    const handleTogglePopoutEvent = (e) => {
      const { popoutId } = e.detail || {};
      if (popoutId) {
        handleTogglePopout(popoutId);
      }
    };

    window.addEventListener('cia:toggle-popout', handleTogglePopoutEvent);
    return () => window.removeEventListener('cia:toggle-popout', handleTogglePopoutEvent);
  }, [handleTogglePopout]);

  // ===========================================================================
  // CALLBACKS - SECONDARY FOOTER (Voice)
  // ===========================================================================
  const handleJoinLeaveVoice = useCallback(() => {
    if (voice.inVoice) {
      voice.leaveVoice?.();
    } else {
      voice.joinVoice?.();
    }
  }, [voice]);

  const handleChangeVoiceChannel = useCallback((channelId) => {
    voice.switchChannel?.(channelId);
  }, [voice]);

  const handleOpenVoiceSettings = useCallback(() => {
    setShowVoiceSettings(true);
  }, []);

  // ===========================================================================
  // VOICE EVENT BRIDGE (for activity bar voice controls)
  // ===========================================================================
  // Listen for voice action events from activity bar and call appropriate handlers
  useEffect(() => {
    const handleVoiceAction = (e) => {
      const { action } = e.detail || {};
      switch (action) {
        case 'joinLeave':
          handleJoinLeaveVoice();
          break;
        case 'toggleMute':
          voice.toggleMute?.();
          break;
        case 'toggleDeafen':
          voice.toggleDeafen?.();
          break;
        case 'openSettings':
          handleOpenVoiceSettings();
          break;
        default:
          break;
      }
    };

    window.addEventListener('cia:voice-action', handleVoiceAction);
    return () => window.removeEventListener('cia:voice-action', handleVoiceAction);
  }, [handleJoinLeaveVoice, voice.toggleMute, voice.toggleDeafen, handleOpenVoiceSettings]);

  // Dispatch voice state changes to activity bar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('cia:voice-state-change', {
      detail: {
        inVoice: voice.inVoice,
        isMuted: voice.muted,
        isDeafened: voice.deafened,
        isJoining: voice.isJoining,
      }
    }));
  }, [voice.inVoice, voice.muted, voice.deafened, voice.isJoining]);

  // Track previous voice state for toast notifications
  const prevVoiceState = useRef({ inVoice: false, isJoining: false });

  useEffect(() => {
    const prev = prevVoiceState.current;
    const roomName = voice.currentRoom || currentRoomName || 'voice channel';

    // Started joining
    if (voice.isJoining && !prev.isJoining) {
      window.dispatchEvent(new CustomEvent('cia:toast', {
        detail: { message: `Joining ${roomName}...`, type: 'info', duration: 3000 }
      }));
    }

    // Successfully joined (was joining or just connected)
    if (voice.inVoice && !prev.inVoice) {
      window.dispatchEvent(new CustomEvent('cia:toast', {
        detail: { message: `Joined ${roomName}`, type: 'success' }
      }));
    }

    // Left voice (was in voice, now not)
    if (!voice.inVoice && prev.inVoice && !voice.isJoining) {
      window.dispatchEvent(new CustomEvent('cia:toast', {
        detail: { message: `Left ${roomName}`, type: 'info' }
      }));
    }

    // Update previous state
    prevVoiceState.current = { inVoice: voice.inVoice, isJoining: voice.isJoining };
  }, [voice.inVoice, voice.isJoining, voice.currentRoom, currentRoomName]);

  // ===========================================================================
  // QUICK ACTION HANDLERS (View Snapshot, Duplicate, Settings)
  // ===========================================================================
  const handleViewSnapshot = useCallback(async (event) => {
    const { viewId, view, cameraState } = event.detail || {};
    if (!viewId) return;

    log.info("Creating snapshot for view:", view?.name || viewId);

    try {
      // Get view configuration for additional details
      const viewConfigManager = getViewConfigurationManager();
      const viewConfig = viewConfigManager.getView(viewId);

      if (!viewConfig) {
        toast.error('View configuration not found');
        return;
      }

      // Create bookmark name with timestamp
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const snapshotName = `${view?.name || viewConfig.name} - ${timestamp}`;
      const resolvedProjectId =
        viewConfig.projectId
        || sessionManager.getProjectId?.()
        || sessionManager.getRoomId?.()
        || null;

      // Get camera state from event or from view config
      const camera = cameraState || viewConfig.camera;

      if (resolvedProjectId) {
        const result = await provenanceService.createSnapshot({
          projectId: resolvedProjectId,
          viewId,
          name: snapshotName,
          description: `Snapshot of "${view?.name || viewConfig.name}"`,
          actionIntent: "save_checkpoint",
          metadata: {
            source: "camera-button",
            camera,
          },
        });

        window.dispatchEvent(new CustomEvent('cia:analysis-snapshot-created', {
          detail: result,
        }));
      } else {
        toast.error('Unable to create snapshot: no active project found');
        return;
      }

      toast.success(`Snapshot saved to Analysis Flow: "${snapshotName}"`);
    } catch (error) {
      log.error("Failed to create snapshot:", error);
      toast.error(`Failed to create snapshot: ${error.message}`);
    }
  }, []);

  const handleViewDuplicate = useCallback(async (event) => {
    const { viewId, view, canvasId: eventCanvasId } = event.detail || {};
    if (!viewId) return;

    log.info("Duplicating view:", view?.name || viewId);

    try {
      // Get the managers
      const viewConfigManager = getViewConfigurationManager();
      const { canvasManager } = await import('@Core/data/managers/CanvasManager.js');

      // 1. Duplicate the view configuration
      const newView = await viewConfigManager.duplicateView(viewId);

      // 2. Find the canvas to place the new view on
      const targetCanvasId = eventCanvasId || canvasManager.getActiveCanvas()?.id;
      if (!targetCanvasId) {
        toast.error('No active canvas to place duplicated view');
        return;
      }

      // 3. Find an empty cell (scan row by row for first empty)
      const canvas = canvasManager.getActiveCanvas();
      const placements = canvas?.placements || [];
      const occupiedCells = new Set(placements.map(p => `${p.row}-${p.col}`));

      let targetRow = 0;
      let targetCol = 0;
      const maxRows = canvas?.size?.rows || 10;
      const maxCols = canvas?.size?.cols || 10;

      // Find first empty cell
      let found = false;
      for (let r = 0; r < maxRows && !found; r++) {
        for (let c = 0; c < maxCols && !found; c++) {
          if (!occupiedCells.has(`${r}-${c}`)) {
            targetRow = r;
            targetCol = c;
            found = true;
          }
        }
      }

      // 4. Place the new view on the canvas
      await canvasManager.addPlacement(targetCanvasId, {
        row: targetRow,
        col: targetCol,
        rowSpan: 1,
        colSpan: 1,
        content: {
          type: 'view',
          viewConfigurationId: newView.id,
        },
      });

      // 5. Record in history for undo
      canvasHistory.record({
        type: 'ADD',
        description: `Duplicate "${view?.name || 'view'}"`,
        undo: async () => {
          // Remove the placement
          const placement = canvasManager.getPlacementForView(newView.id, targetCanvasId);
          if (placement) {
            await canvasManager.removePlacement(targetCanvasId, placement.id);
          }
        },
        redo: async () => {
          await canvasManager.addPlacement(targetCanvasId, {
            row: targetRow,
            col: targetCol,
            rowSpan: 1,
            colSpan: 1,
            content: {
              type: 'view',
              viewConfigurationId: newView.id,
            },
          });
        },
      });

      toast.success(`Duplicated "${view?.name || 'view'}" to ${newView.name}`);
    } catch (error) {
      log.error("Failed to duplicate view:", error);
      toast.error(`Failed to duplicate view: ${error.message}`);
    }
  }, []);

  const handleViewSettings = useCallback((event) => {
    const { viewId, view } = event.detail || {};
    if (!viewId) return;

    log.info("Opening settings for view:", view?.name || viewId);
    // Navigate to Instance Tools tab in left panel with this view selected
    window.dispatchEvent(new CustomEvent('navigate:left-panel', {
      detail: { tab: 'instance-tools', viewId }
    }));
  }, []);

  // Listen for quick action events
  useEffect(() => {
    window.addEventListener('cia:view-snapshot', handleViewSnapshot);
    window.addEventListener('cia:snapshot-view', handleViewSnapshot);
    window.addEventListener('cia:view-duplicate', handleViewDuplicate);
    window.addEventListener('cia:view-settings', handleViewSettings);

    return () => {
      window.removeEventListener('cia:view-snapshot', handleViewSnapshot);
      window.removeEventListener('cia:snapshot-view', handleViewSnapshot);
      window.removeEventListener('cia:view-duplicate', handleViewDuplicate);
      window.removeEventListener('cia:view-settings', handleViewSettings);
    };
  }, [handleViewSnapshot, handleViewDuplicate, handleViewSettings]);

  // ===========================================================================
  // MODAL EVENT LISTENERS
  // ===========================================================================
  useEffect(() => {
    const handleOpenGlobalSearch = () => setShowGlobalSearch(true);
    const handleOpenShortcuts = () => setShowKeyboardShortcuts(true);
    const handleDeleteViewEvent = (e) => {
      const { view } = e.detail || {};
      if (view) handleDeleteView(view);
    };
    const handleOpenDatasetSelector = (e) => {
      const { targetRow, targetCol } = e.detail || {};
      if (targetRow !== undefined && targetCol !== undefined) {
        setDatasetSelectorTarget({ row: targetRow, col: targetCol });
      }
    };

    window.addEventListener('open:global-search', handleOpenGlobalSearch);
    window.addEventListener('open:keyboard-shortcuts', handleOpenShortcuts);
    window.addEventListener('open:help', handleOpenShortcuts); // Help opens shortcuts
    window.addEventListener('cia:delete-view', handleDeleteViewEvent);
    window.addEventListener('cia:open-dataset-selector', handleOpenDatasetSelector);

    return () => {
      window.removeEventListener('open:global-search', handleOpenGlobalSearch);
      window.removeEventListener('open:keyboard-shortcuts', handleOpenShortcuts);
      window.removeEventListener('open:help', handleOpenShortcuts);
      window.removeEventListener('cia:delete-view', handleDeleteViewEvent);
      window.removeEventListener('cia:open-dataset-selector', handleOpenDatasetSelector);
    };
  }, [handleDeleteView]);

  // ===========================================================================
  // TOAST EVENT LISTENER
  // ===========================================================================
  useEffect(() => {
    const handleToastEvent = (e) => {
      const { message, type = 'info', ...options } = e.detail || {};
      if (!message) return;

      // Call the appropriate toast method based on type
      switch (type) {
        case 'success':
          toast.success(message, options);
          break;
        case 'warning':
          toast.warning(message, options);
          break;
        case 'error':
          toast.error(message, options);
          break;
        case 'sync':
          toast.sync(message, options);
          break;
        default:
          toast.info(message, options);
      }
    };

    window.addEventListener('cia:toast', handleToastEvent);
    return () => window.removeEventListener('cia:toast', handleToastEvent);
  }, []);

  // ===========================================================================
  // KEYBOARD SHORTCUTS FOR MODALS
  // ===========================================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger in inputs
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

      // ⌘/Ctrl + K = Global Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
        return;
      }

      // ? = Keyboard Shortcuts (not in inputs)
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
        return;
      }

      // ⌘/Ctrl + / = Keyboard Shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
        return;
      }

      // T = Toggle Instance Tools floating panel (not in inputs)
      if (e.key === 't' && !isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('cia:toggle-instance-tools-floating'));
        return;
      }

      // ⌘/Ctrl + M = Toggle Canvas Navigator
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('cia:toggle-canvas-navigator'));
        return;
      }

      // M = Toggle Canvas Map Panel (not in inputs)
      if (e.key === 'm' && !isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('cia:toggle-canvas-map'));
        return;
      }

      // ⌘/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // ⌘/Ctrl + Shift + Z OR ⌘/Ctrl + Y = Redo
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ===========================================================================
  // RENDER CENTER PANEL
  // ===========================================================================
  const renderCenterPanel = useCallback(() => {
    if (phase3Status !== "ready") {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          {phase3Status === "loading"
            ? "Initializing..."
            : "Initialization failed"}
        </div>
      );
    }

    if (isLoadingRooms && !resolvedWorkspaceRoomId) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          Preparing workspace...
        </div>
      );
    }

    return (
      <CanvasWorkspace
        workspaceId={currentWorkspaceId}
        userId={userId || sessionManager.getUserId?.() || "anonymous"}
        projectId={projectId}
        layoutMode={layoutMode}
        onCloseWorkspace={handleCloseWorkspace}
        onRenameWorkspace={handleRenameWorkspace}
        onDeactivateWorkspace={handleDeactivateWorkspace}
        workspaceViewMode={canvasMode}
        workspaceTabs={workspaceBarItems}
        activeWorkspaceId={currentWorkspaceId}
        onSelectWorkspace={handleWorkspaceChange}
        onSetWorkspaceViewMode={setCanvasMode}
        ensuringWorkspaceIds={ensuringWorkspaceIds}
        tileMaximizedWorkspaceId={tileMaximizedWorkspaceId}
        onMaximizeWorkspace={setTileMaximizedWorkspaceId}
        windowPositions={serverPreferences?.windowPositions}
        windowSizes={serverPreferences?.windowSizes}
        viewportPositions={serverPreferences?.viewportPositions}
        onWindowPositionChange={handleWindowPositionChange}
        onWindowSizeChange={handleWindowSizeChange}
        onViewportPositionChange={handleViewportPositionChange}
      />
    );
  }, [
    phase3Status,
    isLoadingRooms,
    resolvedWorkspaceRoomId,
    currentWorkspaceId,
    userId,
    projectId,
    layoutMode,
    handleCloseWorkspace,
    handleRenameWorkspace,
    canvasMode,
    workspaceBarItems,
    handleWorkspaceChange,
    setCanvasMode,
    handleDeactivateWorkspace,
    ensuringWorkspaceIds,
  ]);

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <AdaptiveProvider autoSyncVR>
      <VRWristMenuProvider>
        <VRAccessibilityProvider>
          <FloatingPanelProvider>
            <VGEditorProvider>
              <CanvasMapProvider>
                <PanelShellProvider>
                  <LeftPanelProvider>
                    <RightPanelProvider>
                      <LayoutPanelProvider canvasId={canvasId}>
            <ThreeEdgeLayout
              // ─────────────────────────────────────────────────────────────
              // TOP BAR (48px Header)
              // ─────────────────────────────────────────────────────────────
              topBar={
                <Header
                  currentProject={projectId ? { id: projectId, name: projectId } : null}
                  projects={[]}
                  user={
                    userId
                      ? {
                          id: userId,
                          name: username,
                          avatar: null,
                          status: userStatus,
                        }
                      : null
                  }
                  notifications={[]}
                  unreadCount={0}
                  viewMode={viewMode}
                  vrAvailable={vrAvailable}
                  onProjectChange={handleProjectChange}
                  onCreateProject={handleCreateProject}
                  onOpenSearch={handleOpenSearch}
                  onOpenHelp={handleOpenHelp}
                  onNotificationClick={handleNotificationClick}
                  onViewModeChange={setViewMode}
                  onNavigate={(path) => log.debug("Navigate:", path)}
                  onSignOut={handleSignOut}
                />
              }
              // ─────────────────────────────────────────────────────────────
              // SECONDARY TOP BAR (Room Header + Workspace Bar)
              // ─────────────────────────────────────────────────────────────
              secondaryTopBar={
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <RoomHeader
                    rooms={roomHeaderRooms}
                    viewingRoomId={currentRoomId}
                    voiceRoomId={voiceRoomId}
                    activeBreakoutId={activeBreakoutId}
                    breakouts={breakouts}
                    pinnedRoomIds={pinnedRoomIds}
                    onSelectRoom={handleRoomSelect}
                    onJoinVoice={(roomId) => {
                      if (roomId) handleChangeVoiceChannel(roomId);
                      else voice.joinVoice?.();
                    }}
                    onJoinBreakout={handleJoinBreakout}
                    onLeaveVoice={() => {
                      voice.leaveVoice?.();
                      setActiveBreakoutId(null);
                    }}
                    onTogglePin={handleTogglePin}
                    isMuted={voice.muted}
                    isDeafened={voice.deafened}
                    onToggleMute={() => voice.toggleMute?.()}
                    onToggleDeafen={() => voice.toggleDeafen?.()}
                    unreadMessages={0}
                    onOpenChat={() => {
                      window.dispatchEvent(new CustomEvent('navigate:right-panel', { detail: { tab: 'chat' } }));
                    }}
                    onCreateRoom={handleCreateRoom}
                  />
                  {canvasMode === 'tabs' && (
                    <WorkspaceBar
                      workspaces={workspaceBarItems}
                      activeWorkspaceId={currentWorkspaceId}
                      onSelectWorkspace={handleWorkspaceChange}
                      onCreateWorkspace={handleCreateWorkspace}
                      onOpenWorkspace={handleOpenWorkspace}
                      onCloseWorkspace={handleCloseWorkspace}
                      onCloseAllWorkspaces={handleRequestCloseAllTabs}
                      onRenameWorkspace={handleRenameWorkspace}
                      onReorderWorkspaces={handleReorderWorkspaces}
                      popouts={popouts}
                      breakouts={breakouts}
                      canvasMode={canvasMode}
                      onModeChange={setCanvasMode}
                      onJoinBreakout={handleJoinBreakout}
                    />
                  )}
                </div>
              }
              // ─────────────────────────────────────────────────────────────
              // LEFT PANEL (Activity Bar + Content)
              // ─────────────────────────────────────────────────────────────
              leftActivityBar={<LeftActivityBar />}
              leftPanelContent={<LeftPanelContent />}
              // ─────────────────────────────────────────────────────────────
              // CENTER PANEL (Canvas Workspace)
              // ─────────────────────────────────────────────────────────────
              centerPanel={renderCenterPanel()}
              // ─────────────────────────────────────────────────────────────
              // RIGHT PANEL (Activity Bar + Content)
              // ─────────────────────────────────────────────────────────────
              rightActivityBar={<RightActivityBar />}
              rightPanelContent={
                <RightPanelContent
                  workspaceId={currentWorkspaceId}
                  projectId={projectId}
                  roomId={currentRoomId}
                  roomName={currentRoomName}
                  availableRooms={availableRooms}
                  onSwitchRoom={switchRoom}
                />
              }
              // ─────────────────────────────────────────────────────────────
              // BOTTOM BAR (28px Status Bar)
              // ─────────────────────────────────────────────────────────────
              bottomBar={<StatusBar />}
            >
              {/* Floating panels rendered inside LayoutContext */}
              <AllFloatingPanels workspaceId={currentWorkspaceId} />
              <FloatingCanvasNavigator />

              {/* Canvas Map Panel (PanelShell floating panel) */}
              <CanvasMapPanel workspaceId={currentWorkspaceId} />

              {/* Unified Companion Panel (PanelShell floating panel) */}
              <UnifiedCompanionPanelShell workspaceId={currentWorkspaceId} />

              {/* VG Editor Panels (PanelShell floating panels) */}
              <VGEditorPanelManager workspaceId={currentWorkspaceId} />

              {/* Canvas Operations Panel */}
              <CanvasOperationsPanel
                isOpen={openPopouts.includes("canvasOps")}
                onClose={() => handleTogglePopout("canvasOps")}
                onMinimize={() => handleTogglePopout("canvasOps")}
                pendingOperations={[]}
                transactions={[]}
                collaborators={roomMembers.map((member, idx) => ({
                  id: member.odId || `user-${idx}`,
                  name: member.name || 'Unknown',
                  online: member.isOnline !== false,
                  editing: false,
                  viewport: { row: 1, col: 1 },
                  cursor: { row: 1, col: 1 },
                }))}
                savePoints={[]}
                currentUserId={userId}
              />
            </ThreeEdgeLayout>

            {/* Create Room Modal */}
            <CreateRoomModal
              isOpen={showCreateRoomModal}
              onClose={() => setShowCreateRoomModal(false)}
              onCreate={async (roomData) => {
                try {
                  await createRoom(roomData);
                  setShowCreateRoomModal(false);
                } catch (error) {
                  log.error("Failed to create room:", error);
                }
              }}
              availableUsers={roomMembers.filter((m) => !m.isYou)}
            />

            <ConfirmationDialog
              isOpen={showCloseAllTabsConfirm}
              onClose={() => setShowCloseAllTabsConfirm(false)}
              title="Close all workspace windows?"
              description="This will close every open workspace window in this room."
              severity="warning"
              confirmLabel="Close All"
              cancelLabel="Cancel"
              itemList={openWorkspaceNames}
              showCheckbox={true}
              checkboxLabel="Don't ask again"
              checkboxChecked={skipCloseAllTabsConfirm}
              onCheckboxChange={setSkipCloseAllTabsConfirm}
              className={isVR ? "confirmation-dialog--vr" : ""}
              onConfirm={handleConfirmCloseAllTabs}
              onCancel={() => setShowCloseAllTabsConfirm(false)}
            />

            {/* Keyboard Shortcuts Modal (? or ⌘/) */}
            <KeyboardShortcutsModal
              isOpen={showKeyboardShortcuts}
              onClose={() => setShowKeyboardShortcuts(false)}
            />

            {/* Global Search Modal (⌘K) */}
            <GlobalSearchModal
              isOpen={showGlobalSearch}
              onClose={() => setShowGlobalSearch(false)}
              onSelect={async (result) => {
                log.debug("Search result selected:", result);
                setShowGlobalSearch(false);

                if (!result?.type || !result?.id) return;

                // Navigate based on result type
                switch (result.type) {
                  case 'project':
                    // Navigate to the project (would change active project)
                    log.info(`Navigating to project: ${result.name}`);
                    toast.info(`Opening project "${result.name}"...`);
                    // Dispatch event to change project
                    window.dispatchEvent(new CustomEvent('cia:navigate-project', {
                      detail: { projectId: result.id, projectName: result.name }
                    }));
                    break;

                  case 'dataset':
                    // Open dataset in left panel
                    log.info(`Navigating to dataset: ${result.name}`);
                    window.dispatchEvent(new CustomEvent('navigate:left-panel', {
                      detail: { tab: 'datasets', datasetId: result.id }
                    }));
                    toast.info(`Showing dataset "${result.name}"`);
                    break;

                  case 'view':
                    // Focus the view on canvas or open it
                    log.info(`Opening view: ${result.name}`);
                    try {
                      const { canvasManager } = await import('@Core/data/managers/CanvasManager.js');
                      const placement = canvasManager.getPlacementForView(result.id);

                      if (placement) {
                        // View is on canvas - scroll to it and select
                        window.dispatchEvent(new CustomEvent('cia:focus-cell', {
                          detail: { row: placement.row, col: placement.col, viewId: result.id }
                        }));
                        toast.info(`Focused "${result.name}"`);
                      } else {
                        // View not on canvas - show in views tab
                        window.dispatchEvent(new CustomEvent('navigate:left-panel', {
                          detail: { tab: 'views', viewId: result.id }
                        }));
                        toast.info(`Showing view "${result.name}" in Views tab`);
                      }
                    } catch (error) {
                      log.error('Error navigating to view:', error);
                    }
                    break;

                  case 'person':
                    // Show person in People tab
                    log.info(`Opening person: ${result.name}`);
                    window.dispatchEvent(new CustomEvent('navigate:right-panel', {
                      detail: { tab: 'people', userId: result.id }
                    }));
                    toast.info(`Showing "${result.name}" in People tab`);
                    break;

                  case 'annotation':
                    // Open annotation in Annotations tab
                    log.info(`Opening annotation: ${result.name}`);
                    window.dispatchEvent(new CustomEvent('navigate:left-panel', {
                      detail: { tab: 'annotations', annotationId: result.id }
                    }));
                    toast.info(`Showing annotation`);
                    break;

                  case 'room':
                    // Switch to the room
                    log.info(`Navigating to room: ${result.name}`);
                    window.dispatchEvent(new CustomEvent('cia:switch-room', {
                      detail: { roomId: result.id, roomName: result.name }
                    }));
                    toast.info(`Switching to room "${result.name}"`);
                    break;

                  default:
                    log.warn(`Unknown result type: ${result.type}`);
                    toast.warning(`Cannot navigate to "${result.name}"`);
                }
              }}
            />

            {/* Delete View Confirmation Dialog */}
            <DeleteViewDialog
              isOpen={deleteViewTarget !== null}
              onClose={() => setDeleteViewTarget(null)}
              view={deleteViewTarget}
              onConfirm={handleConfirmDeleteView}
            />

            {/* Dataset Selector Modal (for empty cell view button) */}
            <DatasetSelectorModal
              isOpen={datasetSelectorTarget !== null}
              onClose={() => setDatasetSelectorTarget(null)}
              targetRow={datasetSelectorTarget?.row ?? 0}
              targetCol={datasetSelectorTarget?.col ?? 0}
            />

            {/* Toast Notifications */}
            <ToastContainer />

            {/* VR Wrist Menu - renders only in VR mode */}
            <VRWristMenu showInDesktop={false} />
                      </LayoutPanelProvider>
                    </RightPanelProvider>
                  </LeftPanelProvider>
                </PanelShellProvider>
              </CanvasMapProvider>
            </VGEditorProvider>
          </FloatingPanelProvider>
        </VRAccessibilityProvider>
      </VRWristMenuProvider>
    </AdaptiveProvider>
  );
}

export default CIAWebApp;
