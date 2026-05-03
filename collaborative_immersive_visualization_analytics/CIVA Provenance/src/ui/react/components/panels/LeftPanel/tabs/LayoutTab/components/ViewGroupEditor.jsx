/**
 * @file ViewGroupEditor.jsx
 * @description Editor for ViewGroup internal layouts in drill-in mode.
 *
 * Features:
 * - Cell grid showing views in their layout positions
 * - Cell selection with visual feedback
 * - Quick layout bar with 7 built-in layouts
 * - "More" button to open full layout picker
 * - Floating action bar when cells selected (Merge, Split, Add View, Remove)
 * - View removal confirmation when changing to smaller layouts
 *
 * @example
 * <ViewGroupEditor
 *   viewGroup={viewGroup}
 *   layout={layout}
 *   allLayouts={allLayouts}
 *   customLayouts={customLayouts}
 *   onBack={handleDrillOut}
 *   onUpdateViewGroup={handleUpdateViewGroup}
 *   onChangeLayout={handleChangeLayout}
 *   onSaveAsCustomLayout={handleSaveAsCustomLayout}
 * />
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { BUILTIN_LAYOUTS, VIEW_TYPES, getLayoutCapacity } from '../constants/layouts.js';
import { LayoutPreview } from './LayoutPreview';
import { LayoutPickerPanel } from './LayoutPickerPanel';
import { FloatingActionBar } from './FloatingActionBar';
import { ViewRemovalConfirmation } from './ViewRemovalConfirmation';

/**
 * Editable name component for ViewGroup
 */
const EditableName = memo(function EditableName({
    value,
    onChange,
    color,
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const handleSubmit = () => {
        if (editValue.trim() && editValue.trim() !== value) {
            onChange(editValue.trim());
        } else {
            setEditValue(value);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') {
            setEditValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                type="text"
                className="viewgroup-editor__name-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSubmit}
                onKeyDown={handleKeyDown}
                style={{ borderColor: color }}
                autoFocus
            />
        );
    }

    return (
        <span
            className="viewgroup-editor__name"
            onDoubleClick={() => setIsEditing(true)}
            title="Double-click to rename"
        >
            {value}
        </span>
    );
});

/**
 * ViewGroupEditor component
 *
 * @param {Object} props - Component props
 * @param {Object} props.viewGroup - ViewGroup to edit
 * @param {Object} props.layout - Current layout configuration
 * @param {Array} props.allLayouts - All available layouts (built-in + custom)
 * @param {Array} props.customLayouts - Custom layout configurations
 * @param {Function} props.onBack - Back/close handler (exit drill-in mode)
 * @param {Function} props.onUpdateViewGroup - Update ViewGroup handler
 * @param {Function} props.onChangeLayout - Change layout handler (viewGroupId, layoutId)
 * @param {Function} [props.onSaveAsCustomLayout] - Save as custom layout handler
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement}
 */
export const ViewGroupEditor = memo(function ViewGroupEditor({
    viewGroup,
    layout,
    allLayouts,
    customLayouts,
    onBack,
    onUpdateViewGroup,
    onChangeLayout,
    onSaveAsCustomLayout,
    className = '',
}) {
    const [selectedCells, setSelectedCells] = useState([]);
    const [showLayoutPicker, setShowLayoutPicker] = useState(false);
    const [pendingLayoutChange, setPendingLayoutChange] = useState(null);

    // Quick layouts (first 7 built-in)
    const quickLayouts = BUILTIN_LAYOUTS.slice(0, 7);

    // Handle cell click for selection
    const handleCellClick = useCallback((index) => {
        setSelectedCells(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    }, []);

    // Handle layout selection
    const handleLayoutSelect = useCallback((newLayout) => {
        const newCapacity = getLayoutCapacity(newLayout);
        if (viewGroup.views.length > newCapacity) {
            // Need to remove views - show confirmation
            setPendingLayoutChange(newLayout);
        } else {
            // Can apply directly
            onChangeLayout(viewGroup.id, newLayout.id);
        }
        setShowLayoutPicker(false);
    }, [viewGroup, onChangeLayout]);

    // Handle confirmed layout change with view removal
    const handleConfirmLayoutChange = useCallback((viewIdsToRemove) => {
        if (pendingLayoutChange) {
            const updatedViews = viewGroup.views.filter(v => !viewIdsToRemove.includes(v.id));
            onUpdateViewGroup({
                ...viewGroup,
                views: updatedViews,
                layoutId: pendingLayoutChange.id,
            });
            setPendingLayoutChange(null);
        }
    }, [pendingLayoutChange, viewGroup, onUpdateViewGroup]);

    // Handle name change
    const handleNameChange = useCallback((newName) => {
        onUpdateViewGroup({ ...viewGroup, name: newName });
    }, [viewGroup, onUpdateViewGroup]);

    // Floating action bar handlers
    const handleMerge = useCallback(() => {
        console.log('Merge cells:', selectedCells);
        setSelectedCells([]);
    }, [selectedCells]);

    const handleSplit = useCallback(() => {
        console.log('Split cell:', selectedCells);
        setSelectedCells([]);
    }, [selectedCells]);

    const handleAddView = useCallback(() => {
        console.log('Add view to cells:', selectedCells);
    }, [selectedCells]);

    const handleRemove = useCallback(() => {
        console.log('Remove cells:', selectedCells);
        setSelectedCells([]);
    }, [selectedCells]);

    // Render a single cell
    const renderCell = (index) => {
        const view = viewGroup.views[index];
        const viewType = view ? VIEW_TYPES[view.type] : null;
        const isSelected = selectedCells.includes(index);
        const isEmpty = !view;

        return (
            <div
                key={index}
                className={`viewgroup-editor__cell ${isSelected ? 'viewgroup-editor__cell--selected' : ''} ${isEmpty ? 'viewgroup-editor__cell--empty' : ''}`}
                onClick={() => handleCellClick(index)}
                style={{
                    '--view-color': viewType?.color || 'transparent',
                    '--vg-color': viewGroup.color,
                }}
            >
                {view ? (
                    <>
                        <div className="viewgroup-editor__cell-icon">
                            <Icon name={viewType?.icon || 'box'} size={24} />
                        </div>
                        <span className="viewgroup-editor__cell-name">
                            {view.name}
                        </span>
                    </>
                ) : (
                    <>
                        <Icon name="plus" size={20} className="viewgroup-editor__cell-plus" />
                        <span className="viewgroup-editor__cell-label">Empty</span>
                    </>
                )}

                {/* Selection indicator */}
                {isSelected && (
                    <div className="viewgroup-editor__cell-check">
                        <Icon name="check" size={12} />
                    </div>
                )}
            </div>
        );
    };

    // Render the cell grid based on layout
    const renderGrid = () => {
        const capacity = getLayoutCapacity(layout);

        // Handle 1+2 layout (top row merged)
        if (layout.merged === 'top') {
            return (
                <div
                    className="viewgroup-editor__grid viewgroup-editor__grid--merged-top"
                >
                    <div className="viewgroup-editor__grid-merged-top">
                        {renderCell(0)}
                    </div>
                    {renderCell(1)}
                    {renderCell(2)}
                </div>
            );
        }

        // Handle 2+1 layout (right column merged)
        if (layout.merged === 'right') {
            return (
                <div
                    className="viewgroup-editor__grid viewgroup-editor__grid--merged-right"
                >
                    {renderCell(0)}
                    <div className="viewgroup-editor__grid-merged-right">
                        {renderCell(1)}
                    </div>
                    {renderCell(2)}
                </div>
            );
        }

        // Standard grid layout
        return (
            <div
                className="viewgroup-editor__grid"
                style={{
                    gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                    gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                }}
            >
                {Array.from({ length: capacity }, (_, i) => renderCell(i))}
            </div>
        );
    };

    return (
        <div
            className={`viewgroup-editor ${className}`}
            style={{ '--vg-color': viewGroup.color }}
        >
            {/* Header */}
            <div className="viewgroup-editor__header">
                <button
                    className="viewgroup-editor__back"
                    onClick={onBack}
                    title="Back to ViewGroups list"
                >
                    <Icon name="arrowLeft" size={18} />
                </button>
                <div
                    className="viewgroup-editor__color"
                    style={{ background: viewGroup.color }}
                />
                <EditableName
                    value={viewGroup.name}
                    onChange={handleNameChange}
                    color={viewGroup.color}
                />
                {viewGroup.linkedTo && (
                    <span className="viewgroup-editor__linked-badge">
                        <Icon name="link2" size={12} />
                        Linked
                    </span>
                )}
                <div className="viewgroup-editor__header-spacer" />
                <span className="viewgroup-editor__meta">
                    {layout.name} • {viewGroup.views.length} views
                </span>
            </div>

            {/* Layout bar */}
            <div className="viewgroup-editor__layout-bar">
                <span className="viewgroup-editor__layout-label">Layout:</span>
                <div className="viewgroup-editor__quick-layouts">
                    {quickLayouts.map(l => (
                        <button
                            key={l.id}
                            className={`viewgroup-editor__quick-layout ${layout.id === l.id ? 'viewgroup-editor__quick-layout--active' : ''}`}
                            onClick={() => handleLayoutSelect(l)}
                            title={l.name}
                        >
                            <LayoutPreview
                                layout={l}
                                size="xs"
                                active={layout.id === l.id}
                                color={viewGroup.color}
                            />
                        </button>
                    ))}
                </div>

                <div className="viewgroup-editor__more-wrapper">
                    <button
                        className={`viewgroup-editor__more ${showLayoutPicker ? 'viewgroup-editor__more--active' : ''}`}
                        onClick={() => setShowLayoutPicker(!showLayoutPicker)}
                    >
                        <Icon name="grid3x3" size={14} />
                        <span>More</span>
                        <Icon name="chevronDown" size={14} />
                    </button>

                    <LayoutPickerPanel
                        isOpen={showLayoutPicker}
                        onClose={() => setShowLayoutPicker(false)}
                        builtinLayouts={BUILTIN_LAYOUTS}
                        customLayouts={customLayouts}
                        currentLayoutId={layout.id}
                        viewGroupColor={viewGroup.color}
                        onSelectLayout={handleLayoutSelect}
                        onSaveAsCurrent={onSaveAsCustomLayout}
                    />
                </div>
            </div>

            {/* Grid area */}
            <div className="viewgroup-editor__content">
                {renderGrid()}

                {/* Floating action bar */}
                <FloatingActionBar
                    selectedCount={selectedCells.length}
                    onMerge={handleMerge}
                    onSplit={handleSplit}
                    onAddView={handleAddView}
                    onRemove={handleRemove}
                />
            </div>

            {/* View removal confirmation */}
            <ViewRemovalConfirmation
                isOpen={!!pendingLayoutChange}
                onClose={() => setPendingLayoutChange(null)}
                onConfirm={handleConfirmLayoutChange}
                currentViews={viewGroup.views}
                newCapacity={pendingLayoutChange ? getLayoutCapacity(pendingLayoutChange) : 0}
                viewGroupName={viewGroup.name}
                newLayoutName={pendingLayoutChange?.name || ''}
            />
        </div>
    );
});

export default ViewGroupEditor;
