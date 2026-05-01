/**
 * @file LinkManagerFloating.jsx
 * @description Link Manager panels as floating windows.
 *
 * Provides floating versions of:
 * - ViewLinkManager: Main panel for managing view-to-view links
 * - UserFollowingPanel: Panel for following other users' views
 * - WorkspaceLinksHub: Overview of all sync groups in workspace
 *
 * Each panel can be opened via custom events or hooks.
 */

import React, { memo, useCallback, useEffect } from "react";
import { FloatingPanel } from "./FloatingPanel";
import { useFloatingPanels } from "./FloatingPanelContext";

// Import the actual panel content
import {
    ViewLinkManager,
    UserFollowingPanel,
    WorkspaceLinksHub,
} from "@UI/react/components/organisms/LinkManagerPanels";

// =============================================================================
// CONSTANTS
// =============================================================================

export const VIEW_LINK_MANAGER_PANEL_ID = "viewLinkManager";
export const USER_FOLLOWING_PANEL_ID = "userFollowing";
export const WORKSPACE_LINKS_HUB_PANEL_ID = "workspaceLinksHub";

export const LINK_PANEL_CONFIGS = {
    [VIEW_LINK_MANAGER_PANEL_ID]: {
        title: "View Links",
        icon: "link",
        color: "teal",
        defaultWidth: 360,
        defaultHeight: 500,
        minWidth: 300,
        minHeight: 400,
    },
    [USER_FOLLOWING_PANEL_ID]: {
        title: "Following",
        icon: "users",
        color: "blue",
        defaultWidth: 320,
        defaultHeight: 450,
        minWidth: 280,
        minHeight: 350,
    },
    [WORKSPACE_LINKS_HUB_PANEL_ID]: {
        title: "Workspace Links",
        icon: "layers",
        color: "purple",
        defaultWidth: 400,
        defaultHeight: 550,
        minWidth: 340,
        minHeight: 400,
    },
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * useViewLinkManagerFloating - Hook to manage View Link Manager floating panel
 */
export function useViewLinkManagerFloating() {
    const { popOutPanel, dockPanel, isPoppedOut, bringToFront } = useFloatingPanels();
    const config = LINK_PANEL_CONFIGS[VIEW_LINK_MANAGER_PANEL_ID];

    const isOpen = isPoppedOut(VIEW_LINK_MANAGER_PANEL_ID);

    const open = useCallback(
        (position = {}) => {
            const defaultX = window.innerWidth - config.defaultWidth - 80;
            const defaultY = 100;

            popOutPanel(VIEW_LINK_MANAGER_PANEL_ID, {
                ...config,
                x: position.x ?? defaultX,
                y: position.y ?? defaultY,
                width: config.defaultWidth,
                height: config.defaultHeight,
            });
        },
        [popOutPanel, config]
    );

    const close = useCallback(() => {
        dockPanel(VIEW_LINK_MANAGER_PANEL_ID);
    }, [dockPanel]);

    const toggle = useCallback(
        (position) => {
            if (isOpen) {
                close();
            } else {
                open(position);
            }
        },
        [isOpen, open, close]
    );

    const focus = useCallback(() => {
        bringToFront(VIEW_LINK_MANAGER_PANEL_ID);
    }, [bringToFront]);

    return { isOpen, open, close, toggle, focus };
}

/**
 * useUserFollowingFloating - Hook to manage User Following floating panel
 */
export function useUserFollowingFloating() {
    const { popOutPanel, dockPanel, isPoppedOut, bringToFront } = useFloatingPanels();
    const config = LINK_PANEL_CONFIGS[USER_FOLLOWING_PANEL_ID];

    const isOpen = isPoppedOut(USER_FOLLOWING_PANEL_ID);

    const open = useCallback(
        (position = {}) => {
            const defaultX = window.innerWidth - config.defaultWidth - 80;
            const defaultY = 100;

            popOutPanel(USER_FOLLOWING_PANEL_ID, {
                ...config,
                x: position.x ?? defaultX,
                y: position.y ?? defaultY,
                width: config.defaultWidth,
                height: config.defaultHeight,
            });
        },
        [popOutPanel, config]
    );

    const close = useCallback(() => {
        dockPanel(USER_FOLLOWING_PANEL_ID);
    }, [dockPanel]);

    const toggle = useCallback(
        (position) => {
            if (isOpen) {
                close();
            } else {
                open(position);
            }
        },
        [isOpen, open, close]
    );

    const focus = useCallback(() => {
        bringToFront(USER_FOLLOWING_PANEL_ID);
    }, [bringToFront]);

    return { isOpen, open, close, toggle, focus };
}

/**
 * useWorkspaceLinksHubFloating - Hook to manage Workspace Links Hub floating panel
 */
export function useWorkspaceLinksHubFloating() {
    const { popOutPanel, dockPanel, isPoppedOut, bringToFront } = useFloatingPanels();
    const config = LINK_PANEL_CONFIGS[WORKSPACE_LINKS_HUB_PANEL_ID];

    const isOpen = isPoppedOut(WORKSPACE_LINKS_HUB_PANEL_ID);

    const open = useCallback(
        (position = {}) => {
            const defaultX = (window.innerWidth - config.defaultWidth) / 2;
            const defaultY = 80;

            popOutPanel(WORKSPACE_LINKS_HUB_PANEL_ID, {
                ...config,
                x: position.x ?? defaultX,
                y: position.y ?? defaultY,
                width: config.defaultWidth,
                height: config.defaultHeight,
            });
        },
        [popOutPanel, config]
    );

    const close = useCallback(() => {
        dockPanel(WORKSPACE_LINKS_HUB_PANEL_ID);
    }, [dockPanel]);

    const toggle = useCallback(
        (position) => {
            if (isOpen) {
                close();
            } else {
                open(position);
            }
        },
        [isOpen, open, close]
    );

    const focus = useCallback(() => {
        bringToFront(WORKSPACE_LINKS_HUB_PANEL_ID);
    }, [bringToFront]);

    return { isOpen, open, close, toggle, focus };
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * ViewLinkManagerFloating - Floating View Link Manager panel
 */
export const ViewLinkManagerFloating = memo(function ViewLinkManagerFloating() {
    const { floatingPanels, dockPanel, bringToFront, popOutPanel } = useFloatingPanels();
    const config = LINK_PANEL_CONFIGS[VIEW_LINK_MANAGER_PANEL_ID];
    const panelState = floatingPanels[VIEW_LINK_MANAGER_PANEL_ID];

    // Listen for open events
    useEffect(() => {
        const handleOpen = (event) => {
            const detail = event.detail || {};

            let x = window.innerWidth - config.defaultWidth - 80;
            let y = 100;

            if (detail.x !== undefined && detail.y !== undefined) {
                x = detail.x;
                y = detail.y;
            }

            if (panelState) {
                bringToFront(VIEW_LINK_MANAGER_PANEL_ID);
            } else {
                popOutPanel(VIEW_LINK_MANAGER_PANEL_ID, {
                    ...config,
                    x,
                    y,
                    width: config.defaultWidth,
                    height: config.defaultHeight,
                });
            }
        };

        const handleToggle = () => {
            if (panelState) {
                dockPanel(VIEW_LINK_MANAGER_PANEL_ID);
            } else {
                popOutPanel(VIEW_LINK_MANAGER_PANEL_ID, {
                    ...config,
                    x: window.innerWidth - config.defaultWidth - 80,
                    y: 100,
                    width: config.defaultWidth,
                    height: config.defaultHeight,
                });
            }
        };

        window.addEventListener('cia:open-view-link-manager', handleOpen);
        window.addEventListener('cia:toggle-view-link-manager', handleToggle);
        return () => {
            window.removeEventListener('cia:open-view-link-manager', handleOpen);
            window.removeEventListener('cia:toggle-view-link-manager', handleToggle);
        };
    }, [popOutPanel, dockPanel, bringToFront, panelState, config]);

    const handleClose = useCallback(() => {
        dockPanel(VIEW_LINK_MANAGER_PANEL_ID);
    }, [dockPanel]);

    if (!panelState) return null;

    return (
        <FloatingPanel
            panelId={VIEW_LINK_MANAGER_PANEL_ID}
            color={config.color}
            onDock={handleClose}
        >
            <ViewLinkManager
                onClose={handleClose}
            />
        </FloatingPanel>
    );
});

/**
 * UserFollowingFloating - Floating User Following panel
 */
export const UserFollowingFloating = memo(function UserFollowingFloating() {
    const { floatingPanels, dockPanel, bringToFront, popOutPanel } = useFloatingPanels();
    const config = LINK_PANEL_CONFIGS[USER_FOLLOWING_PANEL_ID];
    const panelState = floatingPanels[USER_FOLLOWING_PANEL_ID];

    // Listen for open events
    useEffect(() => {
        const handleOpen = (event) => {
            const detail = event.detail || {};

            let x = window.innerWidth - config.defaultWidth - 80;
            let y = 100;

            if (detail.x !== undefined && detail.y !== undefined) {
                x = detail.x;
                y = detail.y;
            }

            if (panelState) {
                bringToFront(USER_FOLLOWING_PANEL_ID);
            } else {
                popOutPanel(USER_FOLLOWING_PANEL_ID, {
                    ...config,
                    x,
                    y,
                    width: config.defaultWidth,
                    height: config.defaultHeight,
                });
            }
        };

        const handleToggle = () => {
            if (panelState) {
                dockPanel(USER_FOLLOWING_PANEL_ID);
            } else {
                popOutPanel(USER_FOLLOWING_PANEL_ID, {
                    ...config,
                    x: window.innerWidth - config.defaultWidth - 80,
                    y: 100,
                    width: config.defaultWidth,
                    height: config.defaultHeight,
                });
            }
        };

        window.addEventListener('cia:open-user-following', handleOpen);
        window.addEventListener('cia:toggle-user-following', handleToggle);
        return () => {
            window.removeEventListener('cia:open-user-following', handleOpen);
            window.removeEventListener('cia:toggle-user-following', handleToggle);
        };
    }, [popOutPanel, dockPanel, bringToFront, panelState, config]);

    const handleClose = useCallback(() => {
        dockPanel(USER_FOLLOWING_PANEL_ID);
    }, [dockPanel]);

    if (!panelState) return null;

    return (
        <FloatingPanel
            panelId={USER_FOLLOWING_PANEL_ID}
            color={config.color}
            onDock={handleClose}
        >
            <UserFollowingPanel
                onClose={handleClose}
            />
        </FloatingPanel>
    );
});

/**
 * WorkspaceLinksHubFloating - Floating Workspace Links Hub panel
 */
export const WorkspaceLinksHubFloating = memo(function WorkspaceLinksHubFloating() {
    const { floatingPanels, dockPanel, bringToFront, popOutPanel } = useFloatingPanels();
    const config = LINK_PANEL_CONFIGS[WORKSPACE_LINKS_HUB_PANEL_ID];
    const panelState = floatingPanels[WORKSPACE_LINKS_HUB_PANEL_ID];

    // Listen for open events
    useEffect(() => {
        const handleOpen = (event) => {
            const detail = event.detail || {};

            let x = (window.innerWidth - config.defaultWidth) / 2;
            let y = 80;

            if (detail.x !== undefined && detail.y !== undefined) {
                x = detail.x;
                y = detail.y;
            }

            if (panelState) {
                bringToFront(WORKSPACE_LINKS_HUB_PANEL_ID);
            } else {
                popOutPanel(WORKSPACE_LINKS_HUB_PANEL_ID, {
                    ...config,
                    x,
                    y,
                    width: config.defaultWidth,
                    height: config.defaultHeight,
                });
            }
        };

        const handleToggle = () => {
            if (panelState) {
                dockPanel(WORKSPACE_LINKS_HUB_PANEL_ID);
            } else {
                popOutPanel(WORKSPACE_LINKS_HUB_PANEL_ID, {
                    ...config,
                    x: (window.innerWidth - config.defaultWidth) / 2,
                    y: 80,
                    width: config.defaultWidth,
                    height: config.defaultHeight,
                });
            }
        };

        window.addEventListener('cia:open-workspace-links-hub', handleOpen);
        window.addEventListener('cia:toggle-workspace-links-hub', handleToggle);
        return () => {
            window.removeEventListener('cia:open-workspace-links-hub', handleOpen);
            window.removeEventListener('cia:toggle-workspace-links-hub', handleToggle);
        };
    }, [popOutPanel, dockPanel, bringToFront, panelState, config]);

    const handleClose = useCallback(() => {
        dockPanel(WORKSPACE_LINKS_HUB_PANEL_ID);
    }, [dockPanel]);

    if (!panelState) return null;

    return (
        <FloatingPanel
            panelId={WORKSPACE_LINKS_HUB_PANEL_ID}
            color={config.color}
            onDock={handleClose}
        >
            <WorkspaceLinksHub
                onClose={handleClose}
            />
        </FloatingPanel>
    );
});

/**
 * AllLinkManagerFloating - Renders all Link Manager floating panels
 *
 * Add this to AllFloatingPanels.jsx
 */
export const AllLinkManagerFloating = memo(function AllLinkManagerFloating() {
    return (
        <>
            <ViewLinkManagerFloating />
            <UserFollowingFloating />
            <WorkspaceLinksHubFloating />
        </>
    );
});

export default AllLinkManagerFloating;
