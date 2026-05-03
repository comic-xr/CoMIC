/**
 * @file Toast.stories.jsx
 * @description Storybook stories for Toast notification components.
 * Demonstrates all toast variants, action buttons, and the toast store.
 */

import React from "react";
import { Toast } from "./Toast";
import { ToastContainer } from "./ToastContainer";
import { toast, useToastStore } from "@UI/react/store/toastStore";
import { linkToasts } from "@UI/react/store/linkToasts";
import { appToasts } from "@UI/react/store/appToasts";

export default {
    title: "Molecules/Toast",
    component: Toast,
    parameters: {
        layout: "centered",
    },
    argTypes: {
        type: {
            control: "select",
            options: ["info", "success", "warning", "error", "sync"],
            description: "Toast severity type",
        },
        message: {
            control: "text",
            description: "Toast message content",
        },
        actionLabel: {
            control: "text",
            description: "Optional action button label",
        },
        description: {
            control: "text",
            description: "Optional secondary description",
        },
        viewColor: {
            control: "color",
            description: "View color indicator (for link toasts)",
        },
        viewName: {
            control: "text",
            description: "View name (for link toasts)",
        },
        userName: {
            control: "text",
            description: "User name (for link toasts)",
        },
        dismissible: {
            control: "boolean",
            description: "Show dismiss button",
        },
        onDismiss: { action: "dismissed" },
        onAction: { action: "action clicked" },
    },
};

// ============================================================================
// BASIC VARIANTS
// ============================================================================

export const Info = {
    args: {
        id: "toast-info",
        type: "info",
        message: "New version available. Refresh to update.",
        dismissible: true,
    },
};

export const Success = {
    args: {
        id: "toast-success",
        type: "success",
        message: "File uploaded successfully!",
        dismissible: true,
    },
};

export const Warning = {
    args: {
        id: "toast-warning",
        type: "warning",
        message: "Connection unstable. Some features may be limited.",
        dismissible: true,
    },
};

export const Error = {
    args: {
        id: "toast-error",
        type: "error",
        message: "Failed to save changes. Please try again.",
        dismissible: true,
    },
};

export const Sync = {
    args: {
        id: "toast-sync",
        type: "sync",
        message: "Camera linked",
        description: 'Now syncing with "Bones View"',
        viewColor: "#2dd4bf",
        viewName: "Bones View",
        dismissible: true,
    },
    parameters: {
        docs: {
            description: {
                story: "Sync toast for link-related events. Shows view color indicator.",
            },
        },
    },
};

// ============================================================================
// WITH ACTION BUTTON
// ============================================================================

export const WithAction = {
    args: {
        id: "toast-action",
        type: "info",
        message: "View moved to trash",
        actionLabel: "Undo",
        dismissible: true,
    },
    parameters: {
        docs: {
            description: {
                story: "Toast with an action button that allows users to undo an operation.",
            },
        },
    },
};

export const ErrorWithRetry = {
    args: {
        id: "toast-retry",
        type: "error",
        message: "Upload failed: Network error",
        actionLabel: "Retry",
        dismissible: true,
    },
    parameters: {
        docs: {
            description: {
                story: "Error toast with a retry action button.",
            },
        },
    },
};

export const SuccessWithView = {
    args: {
        id: "toast-view",
        type: "success",
        message: "Recording saved",
        actionLabel: "View",
        dismissible: true,
    },
};

// ============================================================================
// VARIATIONS
// ============================================================================

export const LongMessage = {
    args: {
        id: "toast-long",
        type: "info",
        message:
            "This is a much longer message that demonstrates how the toast handles extended text content that might wrap to multiple lines in the UI. The toast should handle this gracefully.",
        dismissible: true,
    },
};

export const NotDismissible = {
    args: {
        id: "toast-persistent",
        type: "warning",
        message: "Processing... Please wait.",
        dismissible: false,
    },
    parameters: {
        docs: {
            description: {
                story: "Toast without a dismiss button. Useful for ongoing operations.",
            },
        },
    },
};

export const WithActionNotDismissible = {
    args: {
        id: "toast-action-only",
        type: "error",
        message: "Session expired",
        actionLabel: "Sign In",
        dismissible: false,
    },
    parameters: {
        docs: {
            description: {
                story: "Error toast that can only be dismissed by clicking the action button.",
            },
        },
    },
};

// ============================================================================
// INTERACTIVE DEMO
// ============================================================================

/**
 * Interactive demo showing how to use the toast store.
 */
export const InteractiveDemo = {
    render: () => {
        const showInfo = () => {
            toast.info("This is an info message");
        };

        const showSuccess = () => {
            toast.success("Operation completed successfully!");
        };

        const showWarning = () => {
            toast.warning("Please review before proceeding");
        };

        const showError = () => {
            toast.error("Something went wrong");
        };

        const showWithAction = () => {
            toast.info("View moved to trash", {
                actionLabel: "Undo",
                onAction: () => console.log("Undo clicked!"),
                duration: 5000,
            });
        };

        const showPersistent = () => {
            toast.error("Connection lost", {
                duration: 0,
                actionLabel: "Retry",
                onAction: () => console.log("Retry clicked!"),
            });
        };

        const clearAll = () => {
            toast.dismissAll();
        };

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ color: "#fff", margin: 0 }}>Toast Demo</h3>
                <p style={{ color: "#999", fontSize: "13px", margin: 0 }}>
                    Click buttons to show toasts. They appear in the bottom-right corner.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <button onClick={showInfo} style={buttonStyle}>
                        Info
                    </button>
                    <button onClick={showSuccess} style={buttonStyle}>
                        Success
                    </button>
                    <button onClick={showWarning} style={buttonStyle}>
                        Warning
                    </button>
                    <button onClick={showError} style={buttonStyle}>
                        Error
                    </button>
                    <button onClick={showWithAction} style={buttonStyle}>
                        With Action
                    </button>
                    <button onClick={showPersistent} style={buttonStyle}>
                        Persistent
                    </button>
                    <button onClick={clearAll} style={{ ...buttonStyle, background: "#333" }}>
                        Clear All
                    </button>
                </div>
                <ToastContainer />
            </div>
        );
    },
    parameters: {
        layout: "padded",
        docs: {
            description: {
                story:
                    "Interactive demo showing how to use the toast store. Click buttons to trigger different toast types.",
            },
        },
    },
};

// Button style for demo
const buttonStyle = {
    padding: "8px 16px",
    background: "#2a2a2a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "13px",
    cursor: "pointer",
};

// ============================================================================
// STACKED TOASTS
// ============================================================================

/**
 * Demo showing multiple stacked toasts.
 */
export const StackedToasts = {
    render: () => {
        const showMultiple = () => {
            toast.info("First notification");
            setTimeout(() => toast.success("Second notification"), 200);
            setTimeout(() => toast.warning("Third notification"), 400);
            setTimeout(() => toast.error("Fourth notification"), 600);
        };

        const showMany = () => {
            for (let i = 1; i <= 7; i++) {
                setTimeout(() => {
                    toast.info(`Notification ${i} of 7`);
                }, i * 150);
            }
        };

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ color: "#fff", margin: 0 }}>Stacked Toasts Demo</h3>
                <p style={{ color: "#999", fontSize: "13px", margin: 0 }}>
                    Maximum 5 toasts visible. Oldest are auto-dismissed when limit exceeded.
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={showMultiple} style={buttonStyle}>
                        Show 4 Toasts
                    </button>
                    <button onClick={showMany} style={buttonStyle}>
                        Show 7 Toasts (test limit)
                    </button>
                    <button onClick={() => toast.dismissAll()} style={buttonStyle}>
                        Clear All
                    </button>
                </div>
                <ToastContainer />
            </div>
        );
    },
    parameters: {
        layout: "padded",
        docs: {
            description: {
                story:
                    "Demo showing toast stacking behavior. Maximum 5 toasts are visible at once.",
            },
        },
    },
};

// ============================================================================
// LINK TOASTS
// ============================================================================

/**
 * Demo showing link-specific toast notifications.
 */
export const LinkToastsDemo = {
    render: () => {
        const { addToast } = useToastStore();

        const showViewLinked = () => {
            addToast(linkToasts.viewLinked('Camera', 'Skull View', '#2dd4bf'));
        };

        const showViewUnlinked = () => {
            addToast(linkToasts.viewUnlinked('Camera', 'Skull View'));
        };

        const showJoinedGroup = () => {
            addToast(linkToasts.joinedGroup('Camera', 'Hub View', '#a78bfa', 4));
        };

        const showBecameHub = () => {
            addToast(linkToasts.becameHub('Camera', 3));
        };

        const showLinkBroken = () => {
            addToast(linkToasts.linkBroken('Camera', 'Remote View'));
        };

        const showSyncReceived = () => {
            addToast(linkToasts.syncReceived('Camera', 'Dr. Smith', 'Bones', '#4ade80'));
        };

        const showFollowerJoined = () => {
            addToast(linkToasts.followerJoined('Sarah', 'Camera'));
        };

        const showAllLinked = () => {
            addToast(linkToasts.allPropertiesLinked('Partner View', '#f472b6'));
        };

        const showCannotLink = () => {
            addToast(linkToasts.cannotLink('Views must be in the same workspace'));
        };

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ color: "#fff", margin: 0 }}>Link Toasts Demo</h3>
                <p style={{ color: "#999", fontSize: "13px", margin: 0 }}>
                    Pre-built toasts for view linking events.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <button onClick={showViewLinked} style={buttonStyle}>
                        View Linked
                    </button>
                    <button onClick={showViewUnlinked} style={buttonStyle}>
                        View Unlinked
                    </button>
                    <button onClick={showJoinedGroup} style={buttonStyle}>
                        Joined Group
                    </button>
                    <button onClick={showBecameHub} style={buttonStyle}>
                        Became Hub
                    </button>
                    <button onClick={showLinkBroken} style={buttonStyle}>
                        Link Broken
                    </button>
                    <button onClick={showSyncReceived} style={buttonStyle}>
                        Sync Received
                    </button>
                    <button onClick={showFollowerJoined} style={buttonStyle}>
                        Follower Joined
                    </button>
                    <button onClick={showAllLinked} style={buttonStyle}>
                        All Linked
                    </button>
                    <button onClick={showCannotLink} style={buttonStyle}>
                        Cannot Link
                    </button>
                    <button onClick={() => toast.dismissAll()} style={{ ...buttonStyle, background: "#333" }}>
                        Clear All
                    </button>
                </div>
                <ToastContainer />
            </div>
        );
    },
    parameters: {
        layout: "padded",
        docs: {
            description: {
                story:
                    "Demo showing pre-built link toast helpers for common view linking events.",
            },
        },
    },
};

// ============================================================================
// APP TOASTS
// ============================================================================

/**
 * Demo showing general app toast notifications.
 */
export const AppToastsDemo = {
    render: () => {
        const { addToast } = useToastStore();

        const showFileUploaded = () => {
            addToast(appToasts.fileUploaded('skull_data.vtp'));
        };

        const showDatasetLoaded = () => {
            addToast(appToasts.datasetLoaded('Patient MRI Scan'));
        };

        const showViewCreated = () => {
            addToast(appToasts.viewCreated('Bones View', '#60a5fa'));
        };

        const showViewDeleted = () => {
            addToast(appToasts.viewDeleted('Old View'));
        };

        const showUserJoined = () => {
            addToast(appToasts.userJoined('Dr. Johnson'));
        };

        const showNetworkError = () => {
            addToast(appToasts.networkError());
        };

        const showReconnected = () => {
            addToast(appToasts.reconnected());
        };

        const showCopied = () => {
            addToast(appToasts.copied('Link copied to clipboard'));
        };

        const showUndo = () => {
            addToast(appToasts.undoAvailable('View deleted', () => console.log('Undo!')));
        };

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ color: "#fff", margin: 0 }}>App Toasts Demo</h3>
                <p style={{ color: "#999", fontSize: "13px", margin: 0 }}>
                    Pre-built toasts for general application events.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <button onClick={showFileUploaded} style={buttonStyle}>
                        File Uploaded
                    </button>
                    <button onClick={showDatasetLoaded} style={buttonStyle}>
                        Dataset Loaded
                    </button>
                    <button onClick={showViewCreated} style={buttonStyle}>
                        View Created
                    </button>
                    <button onClick={showViewDeleted} style={buttonStyle}>
                        View Deleted
                    </button>
                    <button onClick={showUserJoined} style={buttonStyle}>
                        User Joined
                    </button>
                    <button onClick={showNetworkError} style={buttonStyle}>
                        Network Error
                    </button>
                    <button onClick={showReconnected} style={buttonStyle}>
                        Reconnected
                    </button>
                    <button onClick={showCopied} style={buttonStyle}>
                        Copied
                    </button>
                    <button onClick={showUndo} style={buttonStyle}>
                        With Undo
                    </button>
                    <button onClick={() => toast.dismissAll()} style={{ ...buttonStyle, background: "#333" }}>
                        Clear All
                    </button>
                </div>
                <ToastContainer />
            </div>
        );
    },
    parameters: {
        layout: "padded",
        docs: {
            description: {
                story:
                    "Demo showing pre-built app toast helpers for common application events.",
            },
        },
    },
};

// ============================================================================
// WITH VIEW INDICATOR
// ============================================================================

export const WithViewIndicator = {
    args: {
        id: "toast-view-indicator",
        type: "sync",
        message: "Camera updated",
        description: "Dr. Smith changed the camera",
        viewColor: "#4ade80",
        viewName: "Bones View",
        userName: "Dr. Smith",
        dismissible: true,
    },
    parameters: {
        docs: {
            description: {
                story: "Sync toast showing view color indicator with user attribution.",
            },
        },
    },
};

export const WithDescription = {
    args: {
        id: "toast-description",
        type: "info",
        message: "Processing started",
        description: "Calculating mesh normals for skull.vtp",
        dismissible: true,
    },
    parameters: {
        docs: {
            description: {
                story: "Toast with a secondary description for additional context.",
            },
        },
    },
};