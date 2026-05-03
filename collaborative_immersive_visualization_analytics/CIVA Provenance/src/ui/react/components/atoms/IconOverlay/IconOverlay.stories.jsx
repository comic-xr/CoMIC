// src/ui/react/components/common/IconOverlay.stories.jsx
import React from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { IconOverlay, SlashedIcon, createSlashedIcon } from "./IconOverlay";
import "./IconOverlay.scss";

export default {
    title: "Atoms/IconOverlay",
    component: IconOverlay,
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div style={{ padding: "40px", background: "#0a0a0f", color: "#e0e0e0" }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// ICON OVERLAY STORIES
// =============================================================================

export const Default = {
    render: () => (
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <SlashedIcon icon="mic" size={24} />
            <span style={{ fontSize: "12px", color: "#808080" }}>Mic Off</span>
        </div>
    ),
};

export const SlashedIcons = {
    render: () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <Icon name="mic" size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Mic On</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedIcon icon="mic" size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Mic Off</span>
                </div>
            </div>
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <Icon name="video" size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Video On</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedIcon icon="video" size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Video Off</span>
                </div>
            </div>
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <Icon name="eye" size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Visible</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedIcon icon="eye" size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Hidden</span>
                </div>
            </div>
        </div>
    ),
};

export const Sizes = {
    render: () => (
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <SlashedIcon icon="mic" size={14} />
            <SlashedIcon icon="mic" size={18} />
            <SlashedIcon icon="mic" size={24} />
            <SlashedIcon icon="mic" size={32} />
        </div>
    ),
};

export const StrokeWidths = {
    render: () => (
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <SlashedIcon icon="compass" size={24} />
                <span style={{ fontSize: "10px", color: "#666" }}>Default</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <SlashedIcon icon="compass" size={24} />
                <span style={{ fontSize: "10px", color: "#666" }}>Default</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <SlashedIcon icon="compass" size={24} />
                <span style={{ fontSize: "10px", color: "#666" }}>Default</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <SlashedIcon icon="compass" size={24} />
                <span style={{ fontSize: "10px", color: "#666" }}>Default</span>
            </div>
        </div>
    ),
};

export const AllCommonIcons = {
    render: () => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>
            {['mic', 'video', 'compass', 'eye', 'wifi', 'volume', 'bell'].map((iconName, index) => (
                <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedIcon icon={iconName} size={24} />
                    <span style={{ fontSize: "10px", color: "#666" }}>{iconName}</span>
                </div>
            ))}
        </div>
    ),
};

// =============================================================================
// USAGE IN BUTTONS
// =============================================================================

export const InButtonContext = {
    render: () => (
        <div style={{ display: "flex", gap: "12px" }}>
            <button
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    background: "#2a2a2a",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#e0e0e0",
                    cursor: "pointer",
                }}
            >
                <Icon name="mic" size={16} />
                <span>Unmuted</span>
            </button>
            <button
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    background: "#3a2020",
                    border: "1px solid #ff4444",
                    borderRadius: "4px",
                    color: "#ff8888",
                    cursor: "pointer",
                }}
            >
                <SlashedIcon icon="mic" size={16} />
                <span>Muted</span>
            </button>
        </div>
    ),
};

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export const CreateSlashedIconFactory = {
    render: () => {
        const SlashedCompass = createSlashedIcon('compass');
        const SlashedWifi = createSlashedIcon('wifi');

        return (
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedCompass size={24} />
                    <span style={{ fontSize: "10px", color: "#666" }}>Factory created</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedWifi size={24} />
                    <span style={{ fontSize: "10px", color: "#666" }}>Factory created</span>
                </div>
            </div>
        );
    },
};