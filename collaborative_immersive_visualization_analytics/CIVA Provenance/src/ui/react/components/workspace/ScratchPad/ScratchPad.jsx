// src/ui/react/components/workspace/ScratchPad/ScratchPad.jsx
// ScratchPad component for clipboard and quick tools
// TODO: Style this component properly later

import React, { memo } from 'react';
import { Icon, IconButton, Badge } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { useScratchPad, useScratchPadListener } from './ScratchPad.logic.js';
import './ScratchPad.scss';

// Icon mapping for clipboard item types
const ITEM_TYPE_ICONS = {
    dataset: 'database',
    view: 'eye',
    note: 'stickyNote',
    filter: 'filter',
    bookmark: 'bookmark',
};

// Icon mapping for quick tools
const TOOL_ICONS = {
    measure: 'ruler',
    angle: 'triangle',
    note: 'stickyNote',
    link: 'link',
    compare: 'gitCompare',
    macro: 'zap',
};

/**
 * ClipboardItem - Single item in the clipboard
 */
const ClipboardItem = memo(function ClipboardItem({
    item,
    onRemove,
    onDragStart,
    onDragEnd,
}) {
    const iconName = ITEM_TYPE_ICONS[item.type] || 'file';

    return (
        <div
            className="scratchpad-clipboard__item"
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            onDragEnd={onDragEnd}
            title={`Drag to canvas: ${item.label}`}
        >
            <Icon name={iconName} size={14} className="scratchpad-clipboard__item-icon" />
            <span className="scratchpad-clipboard__item-label">{item.label}</span>
            <IconButton
                icon="close"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                }}
                tooltip="Remove"
                size="xs"
                variant="ghost"
                className="scratchpad-clipboard__item-remove"
            />
        </div>
    );
});

/**
 * QuickToolButton - Button for quick tool
 */
const QuickToolButton = memo(function QuickToolButton({
    tool,
    isActive,
    onClick,
}) {
    const iconName = TOOL_ICONS[tool.id] || 'zap';

    return (
        <LabeledButton
            icon={iconName}
            label={tool.label.split(' ')[0]}
            onClick={() => onClick(tool.id)}
            active={isActive}
            size="sm"
            variant="ghost"
            className="scratchpad-tools__btn"
        />
    );
});

/**
 * ScratchPadCollapsed - Collapsed state in bottom bar
 */
export function ScratchPadCollapsed({ onClick, itemCount = 0 }) {
    return (
        <LabeledButton
            icon="clipboard"
            label="Scratch"
            onClick={onClick}
            size="sm"
            variant="ghost"
            className="scratchpad-trigger"
        >
            {itemCount > 0 && <Badge count={itemCount} size="sm" />}
            <Icon name="chevronUp" size={12} />
        </LabeledButton>
    );
}

/**
 * ScratchPadExpanded - Expanded pop-out panel
 */
export function ScratchPadExpanded({
    scope,
    onScopeChange,
    isPinned,
    onTogglePin,
    isDetached,
    onToggleDetach,
    onClose,
    clipboardItems,
    onRemoveItem,
    onClearClipboard,
    onDragStart,
    onDragEnd,
    quickTools,
    activeTool,
    onActivateTool,
}) {
    return (
        <div className={`scratchpad-panel ${isDetached ? 'scratchpad-panel--detached' : ''}`}>
            {/* Header */}
            <div className="scratchpad-panel__header">
                <div className="scratchpad-panel__title">
                    <Icon name="clipboard" size={14} />
                    <span>Scratch Pad</span>
                </div>

                {/* Scope Toggle */}
                <select
                    className="scratchpad-panel__scope"
                    value={scope}
                    onChange={(e) => onScopeChange(e.target.value)}
                >
                    <option value="personal">Personal</option>
                    <option value="room">Room Shared</option>
                </select>

                <div className="scratchpad-panel__actions">
                    <IconButton
                        icon={isPinned ? 'pinOff' : 'pin'}
                        onClick={onTogglePin}
                        tooltip={isPinned ? 'Unpin' : 'Pin'}
                        active={isPinned}
                        size="xs"
                        variant="ghost"
                    />
                    <IconButton
                        icon="externalLink"
                        onClick={onToggleDetach}
                        tooltip={isDetached ? 'Dock' : 'Detach'}
                        size="xs"
                        variant="ghost"
                    />
                    <IconButton
                        icon="close"
                        onClick={onClose}
                        tooltip="Close"
                        size="xs"
                        variant="ghost"
                    />
                </div>
            </div>

            {/* Clipboard Section */}
            <div className="scratchpad-clipboard">
                <div className="scratchpad-clipboard__header">
                    <span>Clipboard</span>
                    {clipboardItems.length > 0 && (
                        <IconButton
                            icon="delete"
                            onClick={onClearClipboard}
                            tooltip="Clear all"
                            size="xs"
                            variant="ghost"
                            className="scratchpad-clipboard__clear"
                        />
                    )}
                </div>

                <div className="scratchpad-clipboard__items">
                    {clipboardItems.length === 0 ? (
                        <div className="scratchpad-clipboard__empty">
                            Drag items here or use context menu
                        </div>
                    ) : (
                        clipboardItems.map((item) => (
                            <ClipboardItem
                                key={item.id}
                                item={item}
                                onRemove={onRemoveItem}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                            />
                        ))
                    )}
                </div>

                <div className="scratchpad-clipboard__hint">
                    Drag to canvas to spawn
                </div>
            </div>

            {/* Quick Tools Section */}
            <div className="scratchpad-tools">
                <div className="scratchpad-tools__header">
                    <span>Quick Tools</span>
                    <IconButton
                        icon="settings"
                        tooltip="Customize"
                        size="xs"
                        variant="ghost"
                        className="scratchpad-tools__customize"
                    />
                </div>

                <div className="scratchpad-tools__grid">
                    {quickTools.map((tool) => (
                        <QuickToolButton
                            key={tool.id}
                            tool={tool}
                            isActive={activeTool === tool.id}
                            onClick={onActivateTool}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * ScratchPad - Main component wrapper
 */
export function ScratchPad({ initialExpanded = false }) {
    const {
        isExpanded,
        isDetached,
        isPinned,
        scope,
        clipboardItems,
        quickTools,
        activeTool,
        toggleExpanded,
        toggleDetached,
        togglePinned,
        setScope,
        addToClipboard,
        removeFromClipboard,
        clearClipboard,
        activateTool,
        handleClipboardDragStart,
        handleClipboardDragEnd,
    } = useScratchPad({ initialExpanded });

    // Listen for "add to scratchpad" events
    useScratchPadListener(addToClipboard);

    if (!isExpanded) {
        return (
            <ScratchPadCollapsed
                onClick={toggleExpanded}
                itemCount={clipboardItems.length}
            />
        );
    }

    return (
        <ScratchPadExpanded
            scope={scope}
            onScopeChange={setScope}
            isPinned={isPinned}
            onTogglePin={togglePinned}
            isDetached={isDetached}
            onToggleDetach={toggleDetached}
            onClose={toggleExpanded}
            clipboardItems={clipboardItems}
            onRemoveItem={removeFromClipboard}
            onClearClipboard={clearClipboard}
            onDragStart={handleClipboardDragStart}
            onDragEnd={handleClipboardDragEnd}
            quickTools={quickTools}
            activeTool={activeTool}
            onActivateTool={activateTool}
        />
    );
}

export default ScratchPad;