// src/ui/react/components/workspace/InstanceViewport/InstanceToolbar/InstanceToolbar.jsx
// Simplified toolbar for InstanceViewport
// Shows when viewport is focused OR when pinned

import React, { useState, useRef, memo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { VRButton } from '@UI/react/components/molecules';
import { VRExploreButton } from '@UI/react/components/molecules/VRExploreButton';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * InstanceToolbar - Tool overlay at top of content area
 *
 * Visibility rules:
 * - Shows when viewport is focused (isFocused prop)
 * - Shows when pinned (pinned prop)
 * - Hides otherwise
 *
 * No complex hover states - just focused or pinned.
 */
export const InstanceToolbar = memo(function InstanceToolbar({
    tools,
    isFocused,
    renderTool,
    onOpenInstanceTools,
    instanceId,
    // VR Exploration props (optional)
    dataset,
    viewConfig,
    projectId,
    selection,
    activeSessions,
}) {
    // Toolbar is visible when focused
    const isVisible = isFocused;

    // Inline styles to control visibility (CSS classes removed to prevent conflicts)
    const overlayStyle = isVisible ? {
        opacity: 1,
        visibility: 'visible',
        pointerEvents: 'auto',
        transform: 'translateY(42px)', // Below header + colored border
    } : {
        opacity: 0,
        visibility: 'hidden',
        pointerEvents: 'none',
        transform: 'translateY(32px)',
    };

    return (
        <div
            className="instance-viewport__toolbar-overlay"
            style={overlayStyle}
        >
            <div className="instance-toolbar">
                {/* Tool Groups */}
                <div className="instance-toolbar__groups">
                    {tools.map((tool, index) => renderTool(tool, index))}
                </div>

                {/* Global Tools */}
                <div className="instance-toolbar__global-tools">
                    <div className="instance-toolbar__separator" />
                    <button
                        className="instance-toolbar__tool-button"
                        onClick={onOpenInstanceTools}
                        title="Instance Tools (T)"
                    >
                        <Icon name="wrench" size={16} />
                    </button>
                    {/* Use VRExploreButton when dataset available, fallback to VRButton */}
                    {dataset ? (
                        <VRExploreButton
                            instanceId={instanceId}
                            dataset={dataset}
                            viewConfig={viewConfig}
                            projectId={projectId}
                            selection={selection}
                            activeSessions={activeSessions}
                            size="sm"
                        />
                    ) : (
                        <VRButton instanceId={instanceId} size="sm" />
                    )}
                </div>
            </div>
        </div>
    );
});

export default InstanceToolbar;
