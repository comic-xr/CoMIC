/**
 * @file ViewGroupSelector.jsx
 * @description ViewGroup selector with dropdown, search, and management.
 */

import React, { memo, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Icon, LinkBadge } from '@UI/react/components/atoms';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { useViewGroupSelector, QUICK_CREATE_TEMPLATES } from '../../Footer2.logic';

/**
 * ViewGroup Row in dropdown
 */
const ViewGroupRow = memo(function ViewGroupRow({
    viewGroup,
    isActive,
    onSelect,
    onGoTo,
    onOpenSettings,
}) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`viewgroup-row ${isActive ? 'viewgroup-row--active' : ''}`}
            style={{ '--vg-color': viewGroup.color }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                className="viewgroup-row__main"
                onClick={() => onSelect(viewGroup.id)}
            >
                <span
                    className="viewgroup-row__dot"
                    style={{ background: viewGroup.color }}
                />
                <span className="viewgroup-row__name">{viewGroup.name}</span>
                <span className="viewgroup-row__count">
                    ({viewGroup.views?.length || 0} views)
                </span>
                {viewGroup.linkedTo && (
                    <Icon name="link" size={12} className="viewgroup-row__link-icon" />
                )}
            </button>

            <div className={`viewgroup-row__actions ${isHovered ? 'viewgroup-row__actions--visible' : ''}`}>
                <button
                    className="viewgroup-row__action"
                    onClick={(e) => { e.stopPropagation(); onOpenSettings(viewGroup.id); }}
                    title="Settings"
                >
                    <Icon name="settings" size={14} />
                </button>
                <button
                    className="viewgroup-row__action"
                    onClick={(e) => { e.stopPropagation(); onGoTo(viewGroup.id); }}
                    title="Go to ViewGroup"
                >
                    <Icon name="eye" size={14} />
                </button>
            </div>

            {isActive && (
                <Icon name="check" size={14} className="viewgroup-row__check" />
            )}
        </div>
    );
});

ViewGroupRow.propTypes = {
    viewGroup: PropTypes.object.isRequired,
    isActive: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
    onGoTo: PropTypes.func.isRequired,
    onOpenSettings: PropTypes.func.isRequired,
};

/**
 * Create ViewGroup Popover
 */
const CreateViewGroupPopover = memo(function CreateViewGroupPopover({
    isOpen,
    onClose,
    onQuickCreate,
    onOpenLayoutTab,
    savedTemplates = [],
}) {
    if (!isOpen) return null;

    return (
        <>
            <div className="popover-backdrop" onClick={onClose} />
            <div className="create-viewgroup-popover">
                <div className="create-viewgroup-popover__header">
                    <button className="create-viewgroup-popover__back" onClick={onClose}>
                        <Icon name="arrowLeft" size={14} />
                    </button>
                    <span>Create ViewGroup</span>
                </div>

                {/* Quick Create */}
                <div className="create-viewgroup-popover__section">
                    <div className="create-viewgroup-popover__label">QUICK CREATE</div>
                    <div className="create-viewgroup-popover__templates">
                        {QUICK_CREATE_TEMPLATES.map(template => (
                            <button
                                key={template.id}
                                className="create-viewgroup-popover__template"
                                onClick={() => { onQuickCreate(template.layout); onClose(); }}
                                title={template.label}
                            >
                                <Icon name={template.icon} size={20} />
                                <span>{template.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* From Saved */}
                <div className="create-viewgroup-popover__section">
                    <div className="create-viewgroup-popover__label">FROM SAVED</div>
                    {savedTemplates.length === 0 ? (
                        <div className="create-viewgroup-popover__empty">
                            No saved templates yet
                        </div>
                    ) : (
                        <div className="create-viewgroup-popover__saved-list">
                            {savedTemplates.map(template => (
                                <button
                                    key={template.id}
                                    className="create-viewgroup-popover__saved-item"
                                    onClick={() => { onQuickCreate(template.layoutId, template.id); onClose(); }}
                                >
                                    <span
                                        className="create-viewgroup-popover__saved-dot"
                                        style={{ background: template.color }}
                                    />
                                    <span>{template.name}</span>
                                    <span className="create-viewgroup-popover__saved-layout">
                                        ({template.layoutLabel})
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Advanced */}
                <div className="create-viewgroup-popover__footer">
                    <button
                        className="create-viewgroup-popover__advanced"
                        onClick={() => { onOpenLayoutTab(); onClose(); }}
                    >
                        <Icon name="settings" size={14} />
                        <span>Advanced: Open Layout Tab</span>
                        <Icon name="arrowRight" size={14} />
                    </button>
                </div>
            </div>
        </>
    );
});

CreateViewGroupPopover.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onQuickCreate: PropTypes.func.isRequired,
    onOpenLayoutTab: PropTypes.func.isRequired,
    savedTemplates: PropTypes.array,
};

/**
 * ViewGroup Settings Popover
 */
const ViewGroupSettingsPopover = memo(function ViewGroupSettingsPopover({
    viewGroup,
    onClose,
    onUpdate,
    onDelete,
    onDuplicate,
    onSaveAsTemplate,
    onOpenLayoutTab,
}) {
    const [name, setName] = useState(viewGroup?.name || '');
    const [color, setColor] = useState(viewGroup?.color || '#a855f7');

    const colors = [
        '#a855f7', '#3b82f6', '#22d3ee', '#22c55e',
        '#f59e0b', '#ec4899', '#ef4444', '#14b8a6',
    ];

    const handleSave = () => {
        onUpdate(viewGroup.id, { name, color });
        onClose();
    };

    if (!viewGroup) return null;

    return (
        <>
            <div className="popover-backdrop" onClick={onClose} />
            <div className="viewgroup-settings-popover">
                <div className="viewgroup-settings-popover__header">
                    <span>ViewGroup Settings</span>
                    <button onClick={onClose}>
                        <Icon name="x" size={16} />
                    </button>
                </div>

                <div className="viewgroup-settings-popover__content">
                    {/* Name */}
                    <div className="viewgroup-settings-popover__field">
                        <label>Name:</label>
                        <input
                            type="text"
                            className="viewgroup-settings-popover__input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="ViewGroup name"
                        />
                    </div>

                    {/* Color */}
                    <div className="viewgroup-settings-popover__field">
                        <label>Color:</label>
                        <div className="viewgroup-settings-popover__colors">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    className={`viewgroup-settings-popover__color ${color === c ? 'viewgroup-settings-popover__color--active' : ''}`}
                                    style={{ background: c }}
                                    onClick={() => setColor(c)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Linked To */}
                    {viewGroup.linkedTo && (
                        <div className="viewgroup-settings-popover__linked">
                            <Icon name="link" size={14} />
                            <span>Linked to {viewGroup.linkedToName || 'another ViewGroup'}</span>
                            <button onClick={() => onUpdate(viewGroup.id, { linkedTo: null })}>
                                Unlink
                            </button>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="viewgroup-settings-popover__actions">
                    <button onClick={() => onSaveAsTemplate(viewGroup.id)} title="Save as Template">
                        <Icon name="save" size={14} />
                    </button>
                    <button onClick={() => onDuplicate(viewGroup)} title="Duplicate">
                        <Icon name="copy" size={14} />
                    </button>
                    <button onClick={() => { onDelete(viewGroup.id); onClose(); }} title="Delete">
                        <Icon name="trash" size={14} />
                    </button>
                </div>

                <div className="viewgroup-settings-popover__edit-link">
                    <button onClick={() => { onOpenLayoutTab(viewGroup.id); onClose(); }}>
                        <Icon name="sparkles" size={14} />
                        <span>Edit in Layout Tab</span>
                        <Icon name="arrowRight" size={14} />
                    </button>
                </div>

                <div className="viewgroup-settings-popover__save">
                    <Button variant="primary" onClick={handleSave}>
                        Save Changes
                    </Button>
                </div>
            </div>
        </>
    );
});

ViewGroupSettingsPopover.propTypes = {
    viewGroup: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onDuplicate: PropTypes.func.isRequired,
    onSaveAsTemplate: PropTypes.func.isRequired,
    onOpenLayoutTab: PropTypes.func.isRequired,
};

/**
 * ViewGroupSelector - Main component
 */
const ViewGroupSelector = memo(function ViewGroupSelector({
    viewGroups,
    activeViewGroup,
    mode,
    onSelectViewGroup,
    onCreateViewGroup,
    onUpdateViewGroup,
    onDeleteViewGroup,
    onDuplicateViewGroup,
    onGoToViewGroup,
    onOpenLayoutTab,
    savedTemplates = [],
}) {
    const {
        isOpen,
        searchQuery,
        settingsViewGroupId,
        showCreatePopover,
        filteredViewGroups,
        setSearchQuery,
        toggleDropdown,
        closeDropdown,
        openSettings,
        closeSettings,
        openCreate,
        closeCreate,
    } = useViewGroupSelector(viewGroups, activeViewGroup?.id);

    const settingsViewGroup = viewGroups?.find(vg => vg.id === settingsViewGroupId) || null;

    // Trigger button content based on mode
    const renderTrigger = () => {
        if (mode === 'minimal') {
            // Just color dot
            return (
                <button
                    className="viewgroup-selector__trigger viewgroup-selector__trigger--minimal"
                    onClick={toggleDropdown}
                    style={{ '--vg-color': activeViewGroup?.color || '#666' }}
                >
                    <span
                        className="viewgroup-selector__dot"
                        style={{ background: activeViewGroup?.color || '#666' }}
                    />
                </button>
            );
        }

        // Compact or Full - show name
        const maxWidth = mode === 'compact' ? 120 : 160;

        return (
            <button
                className="viewgroup-selector__trigger"
                onClick={toggleDropdown}
                style={{
                    '--vg-color': activeViewGroup?.color || '#666',
                    maxWidth,
                }}
            >
                <span
                    className="viewgroup-selector__dot"
                    style={{ background: activeViewGroup?.color || '#666' }}
                />
                <span className="viewgroup-selector__name">
                    {activeViewGroup?.name || 'No ViewGroup'}
                </span>
                <Icon
                    name="chevronDown"
                    size={12}
                    className={`viewgroup-selector__chevron ${isOpen ? 'viewgroup-selector__chevron--open' : ''}`}
                />
            </button>
        );
    };

    return (
        <div className="viewgroup-selector">
            {renderTrigger()}

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div className="popover-backdrop" onClick={closeDropdown} />
                    <div className="viewgroup-selector__dropdown">
                        {/* Search */}
                        <div className="viewgroup-selector__search">
                            <SearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search groups..."
                                size="sm"
                                autoFocus
                            />
                        </div>

                        {/* ViewGroup List */}
                        <div className="viewgroup-selector__list">
                            {filteredViewGroups.length === 0 ? (
                                <div className="viewgroup-selector__empty">
                                    No ViewGroups found
                                </div>
                            ) : (
                                filteredViewGroups.map(vg => (
                                    <ViewGroupRow
                                        key={vg.id}
                                        viewGroup={vg}
                                        isActive={vg.id === activeViewGroup?.id}
                                        onSelect={(id) => { onSelectViewGroup(id); closeDropdown(); }}
                                        onGoTo={(id) => { onGoToViewGroup(id); closeDropdown(); }}
                                        onOpenSettings={openSettings}
                                    />
                                ))
                            )}
                        </div>

                        {/* Create New */}
                        <div className="viewgroup-selector__create">
                            <button onClick={openCreate}>
                                <Icon name="plus" size={14} />
                                <span>Create New ViewGroup</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Create Popover */}
            <CreateViewGroupPopover
                isOpen={showCreatePopover}
                onClose={closeCreate}
                onQuickCreate={onCreateViewGroup}
                onOpenLayoutTab={onOpenLayoutTab}
                savedTemplates={savedTemplates}
            />

            {/* Settings Popover */}
            {settingsViewGroup && (
                <ViewGroupSettingsPopover
                    viewGroup={settingsViewGroup}
                    onClose={closeSettings}
                    onUpdate={onUpdateViewGroup}
                    onDelete={onDeleteViewGroup}
                    onDuplicate={onDuplicateViewGroup}
                    onSaveAsTemplate={() => {/* TODO */}}
                    onOpenLayoutTab={onOpenLayoutTab}
                />
            )}
        </div>
    );
});

ViewGroupSelector.propTypes = {
    viewGroups: PropTypes.array,
    activeViewGroup: PropTypes.object,
    mode: PropTypes.oneOf(['minimal', 'compact', 'full']),
    onSelectViewGroup: PropTypes.func,
    onCreateViewGroup: PropTypes.func,
    onUpdateViewGroup: PropTypes.func,
    onDeleteViewGroup: PropTypes.func,
    onDuplicateViewGroup: PropTypes.func,
    onGoToViewGroup: PropTypes.func,
    onOpenLayoutTab: PropTypes.func,
    savedTemplates: PropTypes.array,
};

export { ViewGroupSelector, ViewGroupRow, CreateViewGroupPopover, ViewGroupSettingsPopover };
export default ViewGroupSelector;
