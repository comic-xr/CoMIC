// src/ui/react/components/panels/LeftPanel/tabs/LayoutTab/LayoutTab.jsx
// Layout tab - simplified without Grid/Flow toggle
//
// Both Grid and Flow modes are always accessible:
// - Grid: Manual placement by clicking cells
// - Flow: Auto-arrangement when using "+ New View"
//
// User just picks flow direction (Row-first or Column-first)
// Canvas Navigator is permanently docked at bottom

import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { Section } from '@UI/react/components/molecules/Section';
import { SectionNavGroup } from '@UI/react/components/organisms';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { loadCanvasSize, saveCanvasSize } from '@UI/react/hooks/canvasState.js';
import {
    CanvasNavigator,
    useLayoutPanelContext,
    useLayoutPanel,
    FLOW_DIRECTIONS,
    TOOLS,
} from '@UI/react/components/panels/LayoutPanel';
import './LayoutTab.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

// Per spec: 1×1, 2×1, 1×2, 2×2, 3×1, 3×2, Custom
const SPAWN_SIZES = [
    { id: '1x1', label: '1×1', rows: 1, cols: 1 },
    { id: '2x1', label: '2×1', rows: 1, cols: 2 },
    { id: '1x2', label: '1×2', rows: 2, cols: 1 },
    { id: '2x2', label: '2×2', rows: 2, cols: 2 },
    { id: '3x1', label: '3×1', rows: 1, cols: 3 },
    { id: '3x2', label: '3×2', rows: 2, cols: 3 },
    { id: 'custom', label: 'Custom', rows: null, cols: null, isCustom: true },
];

// Per spec: Single, Side-by-Side, Stacked, 2×2 Grid, 3-up, 1+2, Custom
const QUICK_LAYOUTS = [
    { id: 'single', label: 'Single', icon: 'expand', rows: 1, cols: 1 },
    { id: 'side-by-side', label: 'Side by Side', icon: 'view_column', rows: 1, cols: 2 },
    { id: 'stacked', label: 'Stacked', icon: 'table_rows', rows: 2, cols: 1 },
    { id: '2x2', label: '2×2 Grid', icon: 'grid_3X3', rows: 2, cols: 2 },
    { id: '3-up', label: '3-up', icon: 'layout', rows: 1, cols: 3 },
    { id: '1+2', label: '1+2', icon: 'dashboard', rows: 2, cols: 2, merged: true },
];

// Layout modes per spec
const LAYOUT_MODES = {
    GRID: 'grid',   // Manual placement - drop views where you want
    FLOW: 'flow',   // Auto-arrangement - new views fill next available slot
};

// Template scopes
const TEMPLATE_SCOPES = {
    PERSONAL: 'personal',
    WORKSPACE: 'workspace',
    PROJECT: 'project',
    GLOBAL: 'global',
};

const SCOPE_ICONS = {
    [TEMPLATE_SCOPES.PERSONAL]: 'user',
    [TEMPLATE_SCOPES.WORKSPACE]: 'box',
    [TEMPLATE_SCOPES.PROJECT]: 'folder',
    [TEMPLATE_SCOPES.GLOBAL]: 'globe',
};

const SCOPE_LABELS = {
    [TEMPLATE_SCOPES.PERSONAL]: 'Personal',
    [TEMPLATE_SCOPES.WORKSPACE]: 'Workspace',
    [TEMPLATE_SCOPES.PROJECT]: 'Project',
    [TEMPLATE_SCOPES.GLOBAL]: 'Global',
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Layout Mode Toggle - Grid vs Flow per spec
 */
function LayoutModeToggle({ mode, onChange }) {
    return (
        <div className="layout-tab__mode-toggle">
            <button
                className={`layout-tab__mode-btn ${mode === LAYOUT_MODES.GRID ? 'layout-tab__mode-btn--active' : ''}`}
                onClick={() => onChange?.(LAYOUT_MODES.GRID)}
                title="Grid - Manual placement, drop views where you want"
            >
                <Icon name="grid3x3" size={14} />
                <div className="layout-tab__mode-content">
                    <span className="layout-tab__mode-label">Grid</span>
                    <span className="layout-tab__mode-desc">Manual placement</span>
                </div>
            </button>
            <button
                className={`layout-tab__mode-btn ${mode === LAYOUT_MODES.FLOW ? 'layout-tab__mode-btn--active' : ''}`}
                onClick={() => onChange?.(LAYOUT_MODES.FLOW)}
                title="Flow - Auto-arrangement, views fill next available slot"
            >
                <Icon name="layoutGrid" size={14} />
                <div className="layout-tab__mode-content">
                    <span className="layout-tab__mode-label">Flow</span>
                    <span className="layout-tab__mode-desc">Auto-arrange</span>
                </div>
            </button>
        </div>
    );
}

/**
 * Spawn Size Picker - Select default size for new views
 * Per spec: 1×1, 2×1, 1×2, 2×2, 3×1, 3×2, Custom
 */
function SpawnSizePicker({ value, onChange, customSize, onCustomChange }) {
    const [showCustom, setShowCustom] = useState(false);

    const handleSelect = (size) => {
        if (size.isCustom) {
            setShowCustom(true);
        } else {
            setShowCustom(false);
            onChange?.(size.id);
        }
    };

    return (
        <div className="layout-tab__spawn-sizes">
            {SPAWN_SIZES.filter(s => !s.isCustom).map(size => (
                <button
                    key={size.id}
                    className={`layout-tab__spawn-btn ${value === size.id && !showCustom ? 'layout-tab__spawn-btn--active' : ''}`}
                    onClick={() => handleSelect(size)}
                    title={size.label}
                >
                    <div
                        className="layout-tab__spawn-preview"
                        style={{
                            gridTemplateColumns: `repeat(${size.cols}, 1fr)`,
                            gridTemplateRows: `repeat(${size.rows}, 1fr)`,
                        }}
                    >
                        <div className="layout-tab__spawn-cell" />
                    </div>
                    <span>{size.label}</span>
                </button>
            ))}
            <button
                className={`layout-tab__spawn-btn layout-tab__spawn-btn--custom ${showCustom ? 'layout-tab__spawn-btn--active' : ''}`}
                onClick={() => setShowCustom(!showCustom)}
                title="Custom size"
            >
                <Icon name="settings" size={16} />
                <span>Custom</span>
            </button>

            {/* Custom size inputs */}
            {showCustom && (
                <div className="layout-tab__custom-size">
                    <div className="layout-tab__custom-inputs">
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={customSize?.cols || 1}
                            onChange={(e) => onCustomChange?.({ ...customSize, cols: parseInt(e.target.value) || 1 })}
                            placeholder="W"
                        />
                        <span>×</span>
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={customSize?.rows || 1}
                            onChange={(e) => onCustomChange?.({ ...customSize, rows: parseInt(e.target.value) || 1 })}
                            placeholder="H"
                        />
                    </div>
                    <button
                        className="layout-tab__custom-apply"
                        onClick={() => {
                            onChange?.('custom');
                            setShowCustom(false);
                        }}
                    >
                        Apply
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * Canvas Size Control - Rows and columns steppers with protection warning
 * Per spec: Protection prevents reducing size if views would be removed
 */
function CanvasSizeControl({ rows, cols, onChangeRows, onChangeCols, viewsAtRisk, onCompactLayout }) {
    const hasRisk = viewsAtRisk > 0;

    return (
        <div className="layout-tab__canvas-size">
            <div className="layout-tab__size-controls">
                <div className="layout-tab__size-control">
                    <span className="layout-tab__size-label">Rows</span>
                    <div className="layout-tab__size-stepper">
                        <button
                            onClick={() => onChangeRows?.(Math.max(1, rows - 1))}
                            disabled={rows <= 1}
                        >
                            <Icon name="remove" size={12} />
                        </button>
                        <span className="layout-tab__size-value">{rows}</span>
                        <button onClick={() => onChangeRows?.(rows + 1)}>
                            <Icon name="add" size={12} />
                        </button>
                    </div>
                </div>
                <div className="layout-tab__size-control">
                    <span className="layout-tab__size-label">Cols</span>
                    <div className="layout-tab__size-stepper">
                        <button
                            onClick={() => onChangeCols?.(Math.max(1, cols - 1))}
                            disabled={cols <= 1}
                        >
                            <Icon name="remove" size={12} />
                        </button>
                        <span className="layout-tab__size-value">{cols}</span>
                        <button onClick={() => onChangeCols?.(cols + 1)}>
                            <Icon name="add" size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Protection warning when views would be removed */}
            {hasRisk && (
                <div className="layout-tab__size-warning">
                    <Icon name="alertTriangle" size={12} />
                    <span>{viewsAtRisk} view{viewsAtRisk > 1 ? 's' : ''} would be removed</span>
                    <button onClick={onCompactLayout} title="Auto-move views to fit">
                        Compact
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * Canvas Tools - Select, Pan, Merge, Edit (per spec)
 */
function CanvasTools({ tool, setTool }) {
    return (
        <div className="layout-tab__tools">
            <button
                className={`layout-tab__tool-btn ${tool === TOOLS.SELECT ? 'layout-tab__tool-btn--active' : ''}`}
                onClick={() => setTool?.(TOOLS.SELECT)}
                title="Select - Click to select views, drag to move"
                data-color="blue"
            >
                <Icon name="mousePointer" size={14} />
                <span>Select</span>
            </button>
            <button
                className={`layout-tab__tool-btn ${tool === TOOLS.PAN ? 'layout-tab__tool-btn--active' : ''}`}
                onClick={() => setTool?.(TOOLS.PAN)}
                title="Pan - Drag to pan canvas viewport"
                data-color="teal"
            >
                <Icon name="hand" size={14} />
                <span>Pan</span>
            </button>
            <button
                className={`layout-tab__tool-btn ${tool === TOOLS.MERGE ? 'layout-tab__tool-btn--active' : ''}`}
                onClick={() => setTool?.(TOOLS.MERGE)}
                title="Merge - Select multiple views to merge cells"
                data-color="purple"
            >
                <Icon name="merge" size={14} />
                <span>Merge</span>
            </button>
            <button
                className={`layout-tab__tool-btn ${tool === 'edit' ? 'layout-tab__tool-btn--active' : ''}`}
                onClick={() => setTool?.('edit')}
                title="Edit - Enable resize handles, show drop zones"
                data-color="amber"
            >
                <Icon name="edit" size={14} />
                <span>Edit</span>
            </button>
        </div>
    );
}

/**
 * Layout Templates - Save, load, and manage reusable layout structures
 */
function LayoutTemplates({ templates, onApply, onSave, onDelete, onExport, onImport }) {
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateScope, setNewTemplateScope] = useState(TEMPLATE_SCOPES.PERSONAL);

    const handleSave = useCallback(() => {
        if (!newTemplateName.trim()) return;
        onSave?.({
            name: newTemplateName.trim(),
            scope: newTemplateScope,
        });
        setNewTemplateName('');
        setShowSaveDialog(false);
    }, [newTemplateName, newTemplateScope, onSave]);

    const groupedTemplates = useMemo(() => {
        const groups = {
            [TEMPLATE_SCOPES.PERSONAL]: [],
            [TEMPLATE_SCOPES.WORKSPACE]: [],
            [TEMPLATE_SCOPES.PROJECT]: [],
            [TEMPLATE_SCOPES.GLOBAL]: [],
        };
        (templates || []).forEach(t => {
            if (groups[t.scope]) {
                groups[t.scope].push(t);
            }
        });
        return groups;
    }, [templates]);

    return (
        <div className="layout-tab__templates">
            {/* Save Current Layout */}
            {!showSaveDialog ? (
                <button
                    className="layout-tab__save-template-btn"
                    onClick={() => setShowSaveDialog(true)}
                >
                    <Icon name="add" size={12} />
                    <span>Save Current Layout</span>
                </button>
            ) : (
                <div className="layout-tab__save-dialog">
                    <input
                        type="text"
                        className="layout-tab__template-input"
                        placeholder="Template name..."
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        autoFocus
                    />
                    <div className="layout-tab__scope-picker">
                        {Object.values(TEMPLATE_SCOPES).map(scope => (
                            <button
                                key={scope}
                                className={`layout-tab__scope-btn ${newTemplateScope === scope ? 'layout-tab__scope-btn--active' : ''}`}
                                onClick={() => setNewTemplateScope(scope)}
                                title={SCOPE_LABELS[scope]}
                            >
                                <Icon name={SCOPE_ICONS[scope]} size={12} />
                            </button>
                        ))}
                    </div>
                    <div className="layout-tab__save-actions">
                        <button
                            className="layout-tab__save-btn"
                            onClick={handleSave}
                            disabled={!newTemplateName.trim()}
                        >
                            Save
                        </button>
                        <button
                            className="layout-tab__cancel-btn"
                            onClick={() => {
                                setShowSaveDialog(false);
                                setNewTemplateName('');
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Template List by Scope */}
            {Object.entries(groupedTemplates).map(([scope, scopeTemplates]) => {
                if (scopeTemplates.length === 0) return null;
                return (
                    <div key={scope} className="layout-tab__template-group">
                        <div className="layout-tab__template-group-header">
                            <Icon name={SCOPE_ICONS[scope]} size={10} />
                            <span>{SCOPE_LABELS[scope]}</span>
                        </div>
                        {scopeTemplates.map(template => (
                            <div key={template.id} className="layout-tab__template-item">
                                <button
                                    className="layout-tab__template-apply"
                                    onClick={() => onApply?.(template)}
                                    title={`Apply ${template.name}`}
                                >
                                    <Icon name="layoutGrid" size={12} />
                                    <span className="layout-tab__template-name">{template.name}</span>
                                    <span className="layout-tab__template-size">
                                        {template.rows}×{template.cols}
                                    </span>
                                </button>
                                <div className="layout-tab__template-actions">
                                    <button
                                        className="layout-tab__template-action"
                                        onClick={() => onExport?.(template)}
                                        title="Export as .cialayout"
                                    >
                                        <Icon name="download" size={10} />
                                    </button>
                                    <button
                                        className="layout-tab__template-action layout-tab__template-action--delete"
                                        onClick={() => onDelete?.(template.id)}
                                        title="Delete template"
                                    >
                                        <Icon name="trash" size={10} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}

            {/* Import Template */}
            <button
                className="layout-tab__import-btn"
                onClick={onImport}
            >
                <Icon name="upload" size={12} />
                <span>Import .cialayout</span>
            </button>

            {/* Empty State */}
            {(templates || []).length === 0 && (
                <div className="layout-tab__templates-empty">
                    <Icon name="layoutGrid" size={20} />
                    <span>No saved templates</span>
                    <span className="layout-tab__templates-hint">
                        Save your current layout to reuse it later
                    </span>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LayoutPanelContent = memo(function LayoutPanelContent({
    workspaceId,
    className = '',
}) {
    // =========================================================================
    // GET LAYOUT PANEL CONTEXT
    // =========================================================================

    // Get context if inside LayoutPanelProvider
    const layoutContext = useLayoutPanelContext();

    // Create standalone logic - must be called unconditionally (React hooks rules)
    const standaloneLogic = useLayoutPanel({ canvasId: workspaceId });

    // Prefer context logic if available
    const layoutLogic = layoutContext?.logic || standaloneLogic;

    // =========================================================================
    // STATE
    // =========================================================================

    const [isLoading, setIsLoading] = useState(false);
    const [layoutMode, setLayoutMode] = useState(LAYOUT_MODES.FLOW);
    const [flowDirection, setFlowDirection] = useState(FLOW_DIRECTIONS.ROW);
    const [spawnSize, setSpawnSize] = useState('1x1');
    const [customSpawnSize, setCustomSpawnSize] = useState({ rows: 1, cols: 1 });
    const [tool, setTool] = useState(TOOLS.SELECT);
    const [viewsAtRisk, setViewsAtRisk] = useState(0);

    // Canvas size from localStorage or default
    const [canvasSize, setCanvasSizeState] = useState(() => {
        try {
            const saved = loadCanvasSize?.();
            return saved || { rows: 3, cols: 3 };
        } catch {
            return { rows: 3, cols: 3 };
        }
    });

    // Layout templates state
    const [layoutTemplates, setLayoutTemplates] = useState(() => {
        try {
            const saved = localStorage.getItem('cia:layout-templates');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // =========================================================================
    // SYNC WITH CANVAS MANAGER
    // =========================================================================

    useEffect(() => {
        const canvas = canvasManager?.getCanvas?.();
        if (canvas) {
            setCanvasSizeState({ rows: canvas.rows || 3, cols: canvas.cols || 3 });
            setFlowDirection(canvas.flowDirection || FLOW_DIRECTIONS.ROW);
        }
    }, []);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    // =========================================================================
    // HANDLERS - Use events, let CanvasWorkspace handle API calls
    // =========================================================================

    const handleLayoutModeChange = useCallback((mode) => {
        setLayoutMode(mode);
        window.dispatchEvent(new CustomEvent('cia:layout-mode-changed', {
            detail: { mode }
        }));
    }, []);

    const handleFlowDirectionChange = useCallback((direction) => {
        setFlowDirection(direction);
        // Dispatch event - CanvasWorkspace will handle the actual API call
        window.dispatchEvent(new CustomEvent('cia:flow-direction-changed', {
            detail: { direction }
        }));
    }, []);

    const handleCompactLayout = useCallback(() => {
        window.dispatchEvent(new CustomEvent('cia:compact-layout', {}));
        setViewsAtRisk(0);
    }, []);

    const handleRowsChange = useCallback((rows) => {
        const newSize = { ...canvasSize, rows };
        setCanvasSizeState(newSize);
        try { saveCanvasSize?.(newSize); } catch { /* ignore */ }
        // Dispatch event - CanvasWorkspace will handle the actual API call
        window.dispatchEvent(new CustomEvent('cia:canvas-size-changed', {
            detail: newSize
        }));
    }, [canvasSize]);

    const handleColsChange = useCallback((cols) => {
        const newSize = { ...canvasSize, cols };
        setCanvasSizeState(newSize);
        try { saveCanvasSize?.(newSize); } catch { /* ignore */ }
        // Dispatch event - CanvasWorkspace will handle the actual API call
        window.dispatchEvent(new CustomEvent('cia:canvas-size-changed', {
            detail: newSize
        }));
    }, [canvasSize]);

    const handleQuickLayout = useCallback((layout) => {
        const newSize = { rows: layout.rows, cols: layout.cols };
        setCanvasSizeState(newSize);
        try { saveCanvasSize?.(newSize); } catch { /* ignore */ }
        // Dispatch event - CanvasWorkspace will handle the actual API call
        window.dispatchEvent(new CustomEvent('cia:canvas-size-changed', {
            detail: newSize
        }));
    }, []);

    // =========================================================================
    // TEMPLATE HANDLERS
    // =========================================================================

    const saveTemplates = useCallback((templates) => {
        setLayoutTemplates(templates);
        try {
            localStorage.setItem('cia:layout-templates', JSON.stringify(templates));
        } catch { /* ignore */ }
    }, []);

    const handleSaveTemplate = useCallback(({ name, scope }) => {
        const canvas = canvasManager?.getCanvas?.();
        const newTemplate = {
            id: `template-${Date.now()}`,
            name,
            scope,
            rows: canvasSize.rows,
            cols: canvasSize.cols,
            mergedCells: canvas?.mergedCells || [],
            flowDirection,
            createdAt: new Date().toISOString(),
        };
        saveTemplates([...layoutTemplates, newTemplate]);
        window.dispatchEvent(new CustomEvent('cia:toast', {
            detail: { message: `Template "${name}" saved`, type: 'success' }
        }));
    }, [canvasSize, flowDirection, layoutTemplates, saveTemplates]);

    const handleApplyTemplate = useCallback((template) => {
        const newSize = { rows: template.rows, cols: template.cols };
        setCanvasSizeState(newSize);
        try { saveCanvasSize?.(newSize); } catch { /* ignore */ }
        if (template.flowDirection) {
            setFlowDirection(template.flowDirection);
        }
        // Dispatch event for canvas to apply template
        window.dispatchEvent(new CustomEvent('cia:canvas-size-changed', {
            detail: newSize
        }));
        window.dispatchEvent(new CustomEvent('cia:template-applied', {
            detail: template
        }));
        window.dispatchEvent(new CustomEvent('cia:toast', {
            detail: { message: `Applied "${template.name}"`, type: 'success' }
        }));
    }, []);

    const handleDeleteTemplate = useCallback((templateId) => {
        const updated = layoutTemplates.filter(t => t.id !== templateId);
        saveTemplates(updated);
    }, [layoutTemplates, saveTemplates]);

    const handleExportTemplate = useCallback((template) => {
        const data = JSON.stringify(template, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}.cialayout`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    const handleImportTemplate = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.cialayout,.json';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const template = JSON.parse(text);
                // Validate template structure
                if (!template.name || !template.rows || !template.cols) {
                    throw new Error('Invalid template format');
                }
                // Assign new ID to avoid conflicts
                template.id = `template-${Date.now()}`;
                template.scope = TEMPLATE_SCOPES.PERSONAL;
                saveTemplates([...layoutTemplates, template]);
                window.dispatchEvent(new CustomEvent('cia:toast', {
                    detail: { message: `Imported "${template.name}"`, type: 'success' }
                }));
            } catch (error) {
                window.dispatchEvent(new CustomEvent('cia:toast', {
                    detail: { message: 'Failed to import template', type: 'error' }
                }));
            }
        };
        input.click();
    }, [layoutTemplates, saveTemplates]);

    // =========================================================================
    // RENDER - LOADING
    // =========================================================================

    if (isLoading) {
        return (
            <div className={`layout-tab layout-tab--loading ${className}`}>
                <div className="panel-header panel-header--green">
                    <Icon name="layoutGrid" size={14} className="panel-header__icon" />
                    <span className="panel-header__title">Layout</span>
                </div>
                <div className="layout-tab__loading">
                    <Icon name="loader" size={24} className="spin" />
                    <span>Loading canvas...</span>
                </div>
            </div>
        );
    }

    // =========================================================================
    // SECTION NAV CONFIGURATION
    // =========================================================================

    const layoutSections = useMemo(() => [
        {
            id: 'mode',
            icon: 'layout',
            label: 'Layout Mode',
            color: '#c084fc', // purple
            content: (
                <>
                    <LayoutModeToggle mode={layoutMode} onChange={handleLayoutModeChange} />
                    {layoutMode === LAYOUT_MODES.FLOW && (
                        <div className="layout-tab__flow-options">
                            <span className="layout-tab__flow-label">Fill Direction:</span>
                            <div className="layout-tab__direction-toggle">
                                <button
                                    className={`layout-tab__direction-btn ${flowDirection === FLOW_DIRECTIONS.ROW ? 'layout-tab__direction-btn--active' : ''}`}
                                    onClick={() => handleFlowDirectionChange(FLOW_DIRECTIONS.ROW)}
                                >
                                    <Icon name="arrowRight" size={14} />
                                    <span>Row-first</span>
                                </button>
                                <button
                                    className={`layout-tab__direction-btn ${flowDirection === FLOW_DIRECTIONS.COLUMN ? 'layout-tab__direction-btn--active' : ''}`}
                                    onClick={() => handleFlowDirectionChange(FLOW_DIRECTIONS.COLUMN)}
                                >
                                    <Icon name="arrowDown" size={14} />
                                    <span>Col-first</span>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ),
        },
        {
            id: 'canvas-size',
            icon: 'grid3x3',
            label: 'Canvas Size',
            color: '#60a5fa', // blue
            content: (
                <CanvasSizeControl
                    rows={canvasSize.rows}
                    cols={canvasSize.cols}
                    onChangeRows={handleRowsChange}
                    onChangeCols={handleColsChange}
                    viewsAtRisk={viewsAtRisk}
                    onCompactLayout={handleCompactLayout}
                />
            ),
        },
        {
            id: 'spawn-size',
            icon: 'add',
            label: 'New View Size',
            color: '#34d399', // green
            content: (
                <>
                    <SpawnSizePicker
                        value={spawnSize}
                        onChange={setSpawnSize}
                        customSize={customSpawnSize}
                        onCustomChange={setCustomSpawnSize}
                    />
                    <p className="layout-tab__hint">
                        Default size when creating new views
                    </p>
                </>
            ),
        },
        {
            id: 'quick-layouts',
            icon: 'dashboard',
            label: 'Quick Layouts',
            color: '#fbbf24', // amber
            content: (
                <div className="layout-tab__quick-layouts">
                    {QUICK_LAYOUTS.map(layout => (
                        <button
                            key={layout.id}
                            className="layout-tab__quick-btn"
                            onClick={() => handleQuickLayout(layout)}
                            title={layout.label}
                        >
                            <Icon name={layout.icon} size={14} />
                            <span>{layout.label}</span>
                        </button>
                    ))}
                </div>
            ),
        },
        {
            id: 'tools',
            icon: 'mousePointer',
            label: 'Canvas Tools',
            color: '#7dd3fc', // teal
            content: <CanvasTools tool={tool} setTool={setTool} />,
        },
        {
            id: 'templates',
            icon: 'bookmark',
            label: 'Saved Templates',
            color: '#fb7185', // pink
            itemCount: layoutTemplates.length || undefined,
            content: (
                <LayoutTemplates
                    templates={layoutTemplates}
                    onApply={handleApplyTemplate}
                    onSave={handleSaveTemplate}
                    onDelete={handleDeleteTemplate}
                    onExport={handleExportTemplate}
                    onImport={handleImportTemplate}
                />
            ),
        },
    ], [
        layoutMode, handleLayoutModeChange, flowDirection, handleFlowDirectionChange,
        canvasSize, handleRowsChange, handleColsChange, viewsAtRisk, handleCompactLayout,
        spawnSize, customSpawnSize, handleQuickLayout, tool, layoutTemplates,
        handleApplyTemplate, handleSaveTemplate, handleDeleteTemplate,
        handleExportTemplate, handleImportTemplate,
    ]);

    // =========================================================================
    // RENDER - MAIN
    // =========================================================================

    return (
        <div className={`layout-tab ${className}`}>
            {/* Header */}
            <div className="panel-header panel-header--green">
                <Icon name="layoutGrid" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Layout</span>
            </div>

            {/* Scrollable Content with Section Navigation */}
            <div className="layout-tab__content">
                <SectionNavGroup
                    sections={layoutSections}
                    defaultSectionId="mode"
                    size="sm"
                />
            </div>

            {/* Permanently Docked Canvas Navigator */}
            <div className="layout-tab__navigator">
                <CanvasNavigator
                    isDocked={true}
                    logic={layoutLogic}
                />
            </div>
        </div>
    );
});

// Alias for backward compatibility
export { LayoutPanelContent as LayoutTab };
export default LayoutPanelContent;