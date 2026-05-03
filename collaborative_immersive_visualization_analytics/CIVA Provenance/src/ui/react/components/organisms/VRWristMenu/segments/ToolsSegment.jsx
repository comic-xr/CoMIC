/**
 * @file ToolsSegment.jsx
 * @description Tools sub-menu for VR Wrist Menu.
 *
 * Tools: Select, Rotate, Scale, Measure, Annotate, Slice
 */

import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useVRWristMenu } from '../VRWristMenuContext';
import { Button } from '@UI/react/components/atoms/Button';

/**
 * Tool definitions
 */
const TOOLS = [
    { id: 'select', label: 'Select', icon: 'mousePointer', color: 'blue' },
    { id: 'rotate', label: 'Rotate', icon: 'rotateCw', color: 'teal' },
    { id: 'scale', label: 'Scale', icon: 'expand', color: 'purple' },
    { id: 'measure', label: 'Measure', icon: 'ruler', color: 'amber' },
    { id: 'annotate', label: 'Annotate', icon: 'edit', color: 'pink' },
    { id: 'slice', label: 'Slice', icon: 'scissors', color: 'green' },
];

/**
 * ToolsSegment - Tools sub-menu content
 */
const ToolsSegment = memo(function ToolsSegment({
    activeTool,
    onToolSelect,
}) {
    const { executeAction, closeMenu } = useVRWristMenu();

    const handleToolClick = useCallback((toolId) => {
        onToolSelect?.(toolId);
        executeAction(`tool:${toolId}`, true);
    }, [onToolSelect, executeAction]);

    return (
        <div className="wrist-menu-segment wrist-menu-segment--tools">
            <div className="wrist-menu-segment__title">Tools</div>
            <div className="wrist-menu-segment__grid">
                {TOOLS.map((tool) => (
                    <Button
                        key={tool.id}
                        variant={activeTool === tool.id ? 'primary' : 'ghost'}
                        size="md"
                        icon={tool.icon}
                        onClick={() => handleToolClick(tool.id)}
                    >
                        {tool.label}
                    </Button>
                ))}
            </div>
        </div>
    );
});

ToolsSegment.propTypes = {
    /** Currently active tool */
    activeTool: PropTypes.string,
    /** Tool selection handler */
    onToolSelect: PropTypes.func,
};

export { ToolsSegment, TOOLS };
export default ToolsSegment;
