// src/ui/react/components/common/ToolPanel.stories.jsx
import React from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { ToolPanel } from "./ToolPanel";

export default {
    title: "Organisms/ToolPanel",
    component: ToolPanel,
    parameters: {
        layout: "fullscreen",
    },
    argTypes: {
        isOpen: {
            control: "boolean",
        },
        width: {
            control: { type: "range", min: 250, max: 500, step: 10 },
        },
        onClose: { action: "closed" },
    },
    decorators: [
        (Story) => (
            <div style={{
                height: "600px",
                position: "relative",
                background: "#0a0a0f",
                // Simulate left toolbar
                paddingLeft: "60px",
            }}>
                {/* Mock left toolbar */}
                <div style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "60px",
                    background: "rgba(255,255,255,0.02)",
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                }} />
                <Story />
            </div>
        ),
    ],
};

export const FileExplorer = {
    args: {
        isOpen: true,
        title: "Files",
        icon: <Icon name="folder" size={18} />,
        children: (
            <div style={{ color: "rgba(255,255,255,0.9)" }}>
                <div style={{
                    padding: "12px",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "8px",
                    marginBottom: "12px"
                }}>
                    <div style={{ fontWeight: 500, marginBottom: "8px" }}>Recent Files</div>
                    <ul style={{ paddingLeft: "20px", margin: 0, color: "rgba(255,255,255,0.7)" }}>
                        <li>brain_scan_001.nii</li>
                        <li>patient_data.csv</li>
                        <li>analysis_results.vtk</li>
                    </ul>
                </div>
                <div style={{
                    padding: "12px",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "8px"
                }}>
                    <div style={{ fontWeight: 500, marginBottom: "8px" }}>Datasets</div>
                    <ul style={{ paddingLeft: "20px", margin: 0, color: "rgba(255,255,255,0.7)" }}>
                        <li>MRI Collection</li>
                        <li>CT Scans 2024</li>
                    </ul>
                </div>
            </div>
        ),
    },
};

export const Closed = {
    args: {
        isOpen: false,
        title: "Files",
        icon: <Icon name="folder" size={18} />,
        children: <div>Hidden content</div>,
    },
};

export const SettingsPanel = {
    args: {
        isOpen: true,
        title: "Settings",
        icon: <Icon name="settings" size={18} />,
        width: 400,
        children: (
            <div style={{ color: "rgba(255,255,255,0.9)", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                    <label style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        color: "rgba(255,255,255,0.7)"
                    }}>
                        Theme
                    </label>
                    <select style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(255,255,255,0.04)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        fontSize: "14px"
                    }}>
                        <option>Dark</option>
                        <option>Light</option>
                    </select>
                </div>
                <div>
                    <label style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        color: "rgba(255,255,255,0.7)"
                    }}>
                        Language
                    </label>
                    <select style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(255,255,255,0.04)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        fontSize: "14px"
                    }}>
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                    </select>
                </div>
            </div>
        ),
    },
};

export const DataPanel = {
    args: {
        isOpen: true,
        title: "Datasets",
        icon: <Icon name="folder" size={18} />,
        children: (
            <div style={{ color: "rgba(255,255,255,0.9)" }}>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", marginBottom: "16px" }}>
                    3 datasets loaded
                </p>
                {["Brain MRI", "CT Scan", "PET Data"].map((name, i) => (
                    <div key={i} style={{
                        padding: "12px",
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: "8px",
                        marginBottom: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px"
                    }}>
                        <Icon name="folder" size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
                        <span>{name}</span>
                    </div>
                ))}
            </div>
        ),
    },
};