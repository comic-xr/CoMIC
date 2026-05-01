// src/ui/react/components/common/Button/Button.stories.jsx
import React from "react";
import { Button, IconButton, ButtonGroup } from "./index";

export default {
    title: "Atoms/Button",
    component: Button,
    parameters: {
        layout: "centered",
    },
    argTypes: {
        variant: {
            control: "select",
            options: ["default", "primary", "accent", "ghost", "danger", "success"],
        },
        size: {
            control: "select",
            options: ["sm", "md", "lg"],
        },
        onClick: { action: "clicked" },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: "40px", background: "#0a0a0f" }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// BUTTON STORIES
// =============================================================================

export const Default = {
    args: {
        children: "Button",
        variant: "default",
        size: "md",
    },
};

export const Primary = {
    args: {
        children: "Primary Action",
        variant: "primary",
        size: "md",
    },
};

export const Accent = {
    args: {
        children: "Accent Button",
        variant: "accent",
        size: "md",
    },
};

export const Ghost = {
    args: {
        children: "Ghost Button",
        variant: "ghost",
        size: "md",
    },
};

export const Danger = {
    args: {
        children: "Delete",
        variant: "danger",
        size: "md",
        icon: "trash",
    },
};

export const Success = {
    args: {
        children: "Save Changes",
        variant: "success",
        size: "md",
        icon: "save",
    },
};

export const WithIcon = {
    args: {
        children: "Add Item",
        variant: "primary",
        size: "md",
        icon: "plus",
    },
};

export const WithIconRight = {
    args: {
        children: "Continue",
        variant: "primary",
        size: "md",
        iconRight: "chevronRight",
    },
};

export const Disabled = {
    args: {
        children: "Disabled",
        variant: "primary",
        size: "md",
        disabled: true,
    },
};

export const FullWidth = {
    args: {
        children: "Full Width Button",
        variant: "primary",
        size: "md",
        fullWidth: true,
    },
    decorators: [
        (Story) => (
            <div style={{ width: "300px" }}>
                <Story />
            </div>
        ),
    ],
};

// Sizes showcase
export const Sizes = {
    render: () => (
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
        </div>
    ),
};

// All variants showcase
export const AllVariants = {
    render: () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Button variant="default">Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
        </div>
    ),
};

// =============================================================================
// ICON BUTTON STORIES
// =============================================================================

export const IconButtonDefault = {
    render: () => (
        <IconButton icon="settings" label="Settings" variant="default" size="md" tooltip />
    ),
};

export const IconButtonPrimary = {
    render: () => (
        <IconButton icon="plus" label="Add" variant="primary" size="md" tooltip />
    ),
};

export const IconButtonActive = {
    render: () => (
        <IconButton icon="play" label="Playing" variant="default" size="md" active tooltip />
    ),
};

export const IconButtonSizes = {
    render: () => (
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <IconButton icon="settings" label="Settings" size="sm" />
            <IconButton icon="settings" label="Settings" size="md" />
            <IconButton icon="settings" label="Settings" size="lg" />
        </div>
    ),
};

// =============================================================================
// BUTTON GROUP STORIES
// =============================================================================

export const ButtonGroupExample = {
    render: () => (
        <ButtonGroup>
            <IconButton icon="play" label="Play" />
            <IconButton icon="pause" label="Pause" />
            <IconButton icon="settings" label="Settings" active />
        </ButtonGroup>
    ),
};

export const ButtonGroupWithLabels = {
    render: () => (
        <ButtonGroup>
            <Button variant="ghost" size="sm">Left</Button>
            <Button variant="ghost" size="sm">Center</Button>
            <Button variant="ghost" size="sm">Right</Button>
        </ButtonGroup>
    ),
};

// =============================================================================
// LOADING STATE STORIES
// =============================================================================

export const Loading = {
    args: {
        children: "Saving...",
        variant: "primary",
        size: "md",
        loading: true,
    },
};

export const LoadingVariants = {
    render: () => (
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Button variant="primary" loading>Saving</Button>
            <Button variant="secondary" loading>Loading</Button>
            <Button variant="danger" loading>Deleting</Button>
        </div>
    ),
};

export const IconButtonLoading = {
    render: () => (
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <IconButton icon="upload" label="Uploading" loading tooltip="Uploading..." />
            <IconButton icon="download" label="Download" loading variant="primary" />
        </div>
    ),
};

// =============================================================================
// CONNECTED BUTTON GROUP
// =============================================================================

export const ConnectedButtonGroup = {
    render: () => (
        <ButtonGroup connected>
            <Button variant="secondary">Day</Button>
            <Button variant="secondary">Week</Button>
            <Button variant="secondary">Month</Button>
        </ButtonGroup>
    ),
};

export const ButtonGroupAlignments = {
    render: () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "400px" }}>
            <ButtonGroup align="start" gap="sm">
                <Button variant="secondary">Cancel</Button>
                <Button variant="primary">Submit</Button>
            </ButtonGroup>
            <ButtonGroup align="end" gap="sm">
                <Button variant="secondary">Cancel</Button>
                <Button variant="primary">Submit</Button>
            </ButtonGroup>
            <ButtonGroup align="space-between" fullWidth>
                <Button variant="secondary">Back</Button>
                <Button variant="primary">Continue</Button>
            </ButtonGroup>
        </div>
    ),
};

// =============================================================================
// TOOLTIP DEMOS
// =============================================================================

export const ButtonsWithTooltips = {
    render: () => (
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Button variant="primary" icon="save" tooltip="Save your changes">
                Save
            </Button>
            <IconButton icon="settings" tooltip="Open settings" label="Settings" />
            <IconButton icon="edit" tooltip="Edit item" variant="secondary" label="Edit" />
            <IconButton icon="delete" tooltip="Delete item" variant="danger" label="Delete" />
        </div>
    ),
};