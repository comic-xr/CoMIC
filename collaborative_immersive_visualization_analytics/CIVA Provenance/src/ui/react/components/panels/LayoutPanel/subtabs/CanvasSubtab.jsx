/**
 * CanvasSubtab Component - Canvas configuration for Layout Panel
 */
import React, { memo, useCallback } from 'react';
import { Icon, IconButton, Divider } from '@UI/react/components/atoms';
import { LabeledButton, ToggleGroup } from '@UI/react/components/molecules';
import { SpawnSizePicker } from '../components/SpawnSizePicker';
import { LAYOUT_MODES, FLOW_DIRECTIONS, TOOLS, DROP_MODES } from '../LayoutPanel.logic';
import './CanvasSubtab.scss';

// Layout mode options for ToggleGroup
const LAYOUT_MODE_OPTIONS = [
    { value: LAYOUT_MODES.GRID, icon: 'grid_3X3', label: 'Grid' },
    { value: LAYOUT_MODES.FLOW, icon: 'rows', label: 'Flow' },
];

// Flow direction options
const FLOW_DIRECTION_OPTIONS = [
    { value: FLOW_DIRECTIONS.ROW, icon: 'arrowRight', label: 'Row' },
    { value: FLOW_DIRECTIONS.COLUMN, icon: 'arrowDown', label: 'Col' },
];

// Tool options
const TOOL_OPTIONS = [
    { value: TOOLS.SELECT, icon: 'mousePointer', tooltip: 'Select', color: 'blue' },
    { value: TOOLS.PAN, icon: 'hand', tooltip: 'Pan', color: 'teal' },
    { value: TOOLS.MERGE, icon: 'combine', tooltip: 'Merge', color: 'purple' },
];

// Drop mode options
const DROP_MODE_OPTIONS = [
    { value: DROP_MODES.ADD, icon: 'plusCircle', label: 'Add' },
    { value: DROP_MODES.REPLACE, icon: 'replace', label: 'Replace' },
];

// Quick layout presets
const QUICK_LAYOUTS = [
    { id: '1x1', label: '1×1', grid: [[1]] },
    { id: '2x1', label: '2×1', grid: [[1, 1]] },
    { id: '1x2', label: '1×2', grid: [[1], [1]] },
    { id: '2x2', label: '2×2', grid: [[1, 1], [1, 1]] },
    { id: '1+2', label: '1+2', grid: [[2, 1], [2, 1]] }, // 2-col span on left
    { id: '2+1', label: '2+1', grid: [[1, 2], [1, 2]] }, // 2-col span on right
];

// Quick Layout Button
const QuickLayoutBtn = memo(function QuickLayoutBtn({ layout, onClick }) {
    const rows = layout.grid.length;
    const cols = Math.max(...layout.grid.map(r => r.reduce((s, v) => s + v, 0)));

    return (
        <button className="quick-layout-btn" onClick={() => onClick(layout)} title={layout.label}>
            <div className="quick-layout-btn__icon" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
                {layout.grid.flat().map((span, i) => (
                    <div key={i} className="quick-layout-btn__cell" style={{ gridColumn: `span ${span}` }} />
                ))}
            </div>
            <span>{layout.label}</span>
        </button>
    );
});

export const CanvasSubtab = memo(function CanvasSubtab({ logic }) {
    const {
        layoutMode, setLayoutMode, flowDirection, setFlowDirection,
        spawnSize, setSpawnSize, tool, setTool, editMode, toggleEditMode,
        dropMode, setDropMode, canUndo, canRedo, undo, redo, applyQuickLayout,
    } = logic;

    const handleQuickLayout = useCallback((layout) => {
        applyQuickLayout?.(layout);
    }, [applyQuickLayout]);

    return (
        <div className="canvas-subtab">
            {/* Layout Mode */}
            <div className="canvas-subtab__card" data-color="blue">
                <div className="canvas-subtab__card-header">
                    <Icon name='grid_3X3' size={10} />
                    <span>Layout Mode</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ToggleGroup
                        options={LAYOUT_MODE_OPTIONS}
                        value={layoutMode}
                        onChange={setLayoutMode}
                        variant="etched"
                        size="sm"
                    />
                </div>

                {layoutMode === LAYOUT_MODES.FLOW && (
                    <div className="canvas-subtab__flow-direction">
                        <span className="canvas-subtab__label">Direction:</span>
                        <ToggleGroup
                            options={FLOW_DIRECTION_OPTIONS}
                            value={flowDirection}
                            onChange={setFlowDirection}
                            variant="etched"
                            size="sm"
                            color="green"
                        />
                    </div>
                )}

                <div className="canvas-subtab__description">
                    {layoutMode === LAYOUT_MODES.FLOW ? 'Views auto-arrange when added.' : 'Manually place and resize views.'}
                </div>
            </div>

            {/* New View Size */}
            <div className="canvas-subtab__card" data-color="green">
                <div className="canvas-subtab__card-header">
                    <Icon name="plusCircle" size={10} />
                    <span>New View Size</span>
                </div>
                <SpawnSizePicker value={spawnSize} onChange={setSpawnSize} />
                <div className="canvas-subtab__description">
                    Click empty cell or drag dataset to spawn at this size
                </div>
            </div>

            {/* Quick Layouts */}
            <div className="canvas-subtab__card" data-color="amber">
                <div className="canvas-subtab__card-header">
                    <Icon name="layoutGrid" size={10} />
                    <span>Quick Layouts</span>
                </div>
                <div className="canvas-subtab__quick-layouts">
                    {QUICK_LAYOUTS.map(layout => (
                        <QuickLayoutBtn key={layout.id} layout={layout} onClick={handleQuickLayout} />
                    ))}
                </div>
            </div>

            {/* Tools */}
            <div className="canvas-subtab__card" data-color="blue">
                <div className="canvas-subtab__card-header">
                    <Icon name="mousePointer" size={10} />
                    <span>Tools</span>
                </div>

                <div className="canvas-subtab__tools">
                    <div className="canvas-subtab__tool-group">
                        {TOOL_OPTIONS.map(opt => (
                            <IconButton
                                key={opt.value}
                                icon={opt.icon}
                                onClick={() => setTool?.(opt.value)}
                                tooltip={opt.tooltip}
                                active={tool === opt.value}
                                color={tool === opt.value ? opt.color : undefined}
                                size="sm"
                                variant="ghost"
                                className="layout-tool-btn"
                            />
                        ))}

                        <Divider orientation="vertical" />

                        <LabeledButton
                            icon="pencil"
                            label={editMode ? 'Done' : 'Edit'}
                            onClick={toggleEditMode}
                            active={editMode}
                            size="sm"
                            variant={editMode ? 'primary' : 'ghost'}
                        />

                        <Divider orientation="vertical" />

                        <IconButton
                            icon="undo"
                            onClick={undo}
                            disabled={!canUndo}
                            tooltip="Undo"
                            size="sm"
                            variant="ghost"
                        />
                        <IconButton
                            icon="redo"
                            onClick={redo}
                            disabled={!canRedo}
                            tooltip="Redo"
                            size="sm"
                            variant="ghost"
                        />
                    </div>

                    {editMode && (
                        <div className="canvas-subtab__drop-mode">
                            <span className="canvas-subtab__label">Drop:</span>
                            <ToggleGroup
                                options={DROP_MODE_OPTIONS}
                                value={dropMode}
                                onChange={setDropMode}
                                variant="etched"
                                size="sm"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default CanvasSubtab;