/**
 * @file CreateOpenPopover.jsx
 * @description Popover for creating new workspaces or opening existing ones
 */

import React, { memo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { CREATE_OPTIONS, WORKSPACE_TYPES, useWorkspaceSearch } from './CanvasTabsBar.logic';

/**
 * CreateOpenPopover - Create new or open existing workspace
 */
const CreateOpenPopover = memo(function CreateOpenPopover({
    isOpen,
    onClose,
    workspaces,
    onCreateWorkspace,
    onOpenWorkspace,
}) {
    const popoverRef = useRef(null);
    const closedWorkspaces = workspaces.filter(w => !w.isOpen);
    const { searchQuery, setSearchQuery, filteredWorkspaces } = useWorkspaceSearch(closedWorkspaces);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleCreate = (optionId) => {
        onCreateWorkspace?.(optionId);
        onClose();
    };

    const handleOpen = (workspaceId) => {
        onOpenWorkspace?.(workspaceId);
        onClose();
    };

    return (
        <div ref={popoverRef} className="create-open-popover">
            {/* Create New Section */}
            <div className="create-open-popover__section">
                <div className="create-open-popover__header">Create New</div>

                {CREATE_OPTIONS.map(option => (
                    <button
                        key={option.id}
                        className="create-open-popover__create-option"
                        onClick={() => handleCreate(option.id)}
                    >
                        <div className="create-open-popover__option-icon">
                            <Icon name={option.icon} size={16} />
                        </div>
                        <div className="create-open-popover__option-content">
                            <div className="create-open-popover__option-label">
                                {option.label}
                            </div>
                            <div className="create-open-popover__option-desc">
                                {option.description}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="create-open-popover__divider" />

            {/* Open Existing Section */}
            <div className="create-open-popover__section">
                <div className="create-open-popover__header-row">
                    <span className="create-open-popover__header">Open Existing</span>
                    <span className="create-open-popover__count">
                        {closedWorkspaces.length} available
                    </span>
                </div>

                {/* Search */}
                <SearchInput
                    className="create-open-popover__search"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search workspaces..."
                    size="sm"
                />

                {/* Workspace list */}
                <div className="create-open-popover__list">
                    {filteredWorkspaces.length === 0 ? (
                        <div className="create-open-popover__empty">
                            No workspaces found
                        </div>
                    ) : (
                        filteredWorkspaces.slice(0, 5).map(workspace => {
                            const typeConfig = WORKSPACE_TYPES[workspace.type] || WORKSPACE_TYPES.workspace;
                            return (
                                <button
                                    key={workspace.id}
                                    className="create-open-popover__workspace"
                                    onClick={() => handleOpen(workspace.id)}
                                >
                                    <Icon
                                        name={typeConfig.icon}
                                        size={14}
                                        className={`create-open-popover__workspace-icon create-open-popover__workspace-icon--${typeConfig.color}`}
                                    />
                                    <span className="create-open-popover__workspace-name">
                                        {workspace.name}
                                    </span>
                                    <span className="create-open-popover__workspace-action">
                                        Open
                                    </span>
                                </button>
                            );
                        })
                    )}

                    {filteredWorkspaces.length > 5 && (
                        <div className="create-open-popover__more">
                            +{filteredWorkspaces.length - 5} more workspaces
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

CreateOpenPopover.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    workspaces: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.oneOf(['workspace', 'subset', 'scratch']),
        isOpen: PropTypes.bool,
    })).isRequired,
    onCreateWorkspace: PropTypes.func,
    onOpenWorkspace: PropTypes.func,
};

export { CreateOpenPopover };
export default CreateOpenPopover;
