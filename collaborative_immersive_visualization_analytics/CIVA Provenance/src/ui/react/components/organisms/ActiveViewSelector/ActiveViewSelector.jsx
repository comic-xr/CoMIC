/**
 * @file ActiveViewSelector.jsx
 * @description Dropdown selector for the currently active view/instance.
 * Features "ACTIVE VIEW" label and colored dot indicator.
 * 
 * Uses DropdownPortal for simpler portal rendering.
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { DropdownPortal } from '@UI/react/components/atoms/DropdownPortal';
import { ViewHubFlyout } from '@UI/react/components/organisms/ViewContextBlock';
import { formatGridPosition } from '@UI/react/utils/gridPosition.js';

import './ActiveViewSelector.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const VIEW_COLORS = [
    '#60a5fa', // Blue
    '#34d399', // Green
    '#2dd4bf', // Teal
    '#fb7185', // Pink
    '#c084fc', // Purple
    '#fbbf24', // Amber
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a consistent color for a view based on its ID.
 */
const getViewColor = (viewId, index = 0) => {
    if (!viewId) return VIEW_COLORS[0];
    const hash = viewId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return VIEW_COLORS[(hash + index) % VIEW_COLORS.length];
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Active view selector with dropdown.
 * Uses DropdownPortal for portal rendering to escape stacking contexts.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.activeView] - Currently active view { id, name, type, position }
 * @param {Array} [props.onCanvasViews] - Views currently placed on canvas
 * @param {Array} [props.availableViews] - Views available but not placed
 * @param {Function} [props.onSelect] - Callback when a view is selected (viewId or null to clear)
 * @param {Function} [props.onPlace] - Callback to place an available view
 * @param {Function} [props.onRemove] - Callback to remove a view from canvas
 * @param {Function} [props.onCreate] - Callback to create a new view
 * @param {Function} [props.onAction] - Optional action handler (action, view)
 * @param {boolean} [props.isSubset] - Whether selector is in subset mode
 * @param {boolean} [props.useViewHub] - Use full ViewHubFlyout UI
 * @param {string} [props.className] - Additional CSS class
 */
export function ActiveViewSelector({
    activeView,
    onCanvasViews = [],
    availableViews = [],
    onSelect,
    onPlace,
    onRemove,
    onCreate,
    onAction,
    isSubset = false,
    useViewHub = true,
    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const triggerRef = useRef(null);

    // Get color for active view
    const activeViewColor = activeView?.color || (activeView ? getViewColor(activeView.id) : VIEW_COLORS[0]);
    const hasActiveView = !!activeView;
    const displayName = activeView?.name || 'No active view';

    // Filter views by search query (fallback list)
    const filterViews = useCallback((views) => {
        if (!searchQuery.trim()) return views;
        const query = searchQuery.toLowerCase();
        return views.filter((v) => (v?.name || '').toLowerCase().includes(query));
    }, [searchQuery]);

    const decoratedOnCanvasViews = useMemo(
        () => onCanvasViews.map((view, index) => ({
            ...view,
            color: view?.color || getViewColor(view?.id, index),
        })),
        [onCanvasViews]
    );

    const decoratedAvailableViews = useMemo(
        () => availableViews.map((view, index) => ({
            ...view,
            color: view?.color || getViewColor(view?.id, index + onCanvasViews.length),
        })),
        [availableViews, onCanvasViews.length]
    );

    const filteredOnCanvas = filterViews(decoratedOnCanvasViews);
    const filteredAvailable = filterViews(decoratedAvailableViews);

    // Toggle dropdown
    const handleToggle = useCallback(() => {
        setIsOpen(prev => !prev);
        if (isOpen) {
            setSearchQuery(''); // Clear search when closing
        }
    }, [isOpen]);

    // Close dropdown
    const handleClose = useCallback(() => {
        setIsOpen(false);
        setSearchQuery('');
    }, []);

    // Handle view selection
    const handleSelect = useCallback((view) => {
        onSelect?.(view?.id);
        handleClose();
    }, [onSelect, handleClose]);

    const handleClearSelection = useCallback(() => {
        onSelect?.(null);
        handleClose();
    }, [onSelect, handleClose]);

    // Handle placing an available view (fallback list)
    const handlePlace = useCallback((view) => {
        onPlace?.(view.id);
        handleClose();
    }, [onPlace, handleClose]);

    const handleAction = useCallback((action, view) => {
        if (onAction) {
            onAction(action, view);
            return;
        }

        if (action === 'place') {
            onPlace?.(view?.id);
        } else if (action === 'remove') {
            onRemove?.(view?.id);
        } else if (action === 'create') {
            onCreate?.();
        }
    }, [onAction, onPlace, onRemove, onCreate]);

    return (
        <div className={`active-view-selector ${className}`}>
            {/* Trigger Button */}
            <button
                ref={triggerRef}
                type="button"
                className={`active-view-selector__trigger ${hasActiveView ? '' : 'active-view-selector__trigger--empty'}`}
                onClick={handleToggle}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                style={{ '--view-color': activeViewColor }}
            >
                {/* Colored dot indicator */}
                <span
                    className="active-view-selector__dot"
                    style={{ background: hasActiveView ? activeViewColor : 'transparent' }}
                />

                {/* Label and name */}
                <div className="active-view-selector__info">
                    <span className="active-view-selector__label">Active View</span>
                    <span className="active-view-selector__name">{displayName}</span>
                </div>

                {/* Chevron */}
                <Icon name="chevronDown" size={12} className="active-view-selector__chevron" />
            </button>

            {/* Dropdown via Portal */}
            <DropdownPortal
                open={isOpen}
                onClose={handleClose}
                triggerRef={triggerRef}
                align="start"
                position="bottom"
                className="active-view-selector__dropdown"
            >
                {useViewHub ? (
                    <div className="active-view-selector__viewhub-wrapper">
                        {hasActiveView && (
                            <button
                                type="button"
                                className="active-view-selector__clear-btn"
                                onClick={handleClearSelection}
                            >
                                <Icon name="close" size={12} />
                                Clear active view
                            </button>
                        )}
                        <ViewHubFlyout
                            views={decoratedOnCanvasViews}
                            available={isSubset ? [] : decoratedAvailableViews}
                            activeView={activeView}
                            isSubset={isSubset}
                            onSelect={handleSelect}
                            onAction={handleAction}
                            onClose={handleClose}
                        />
                    </div>
                ) : (
                    <div className="active-view-selector__content-wrapper">
                        {/* Search input - fixed at top */}
                        {(onCanvasViews.length > 3 || availableViews.length > 0) && (
                            <div className="active-view-selector__search">
                                <SearchInput
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                    placeholder="Search views..."
                                    size="sm"
                                    className="active-view-selector__search-input"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Scrollable content area */}
                        <div className="active-view-selector__content">
                            {hasActiveView && (
                                <button
                                    type="button"
                                    className="active-view-selector__item active-view-selector__item--clear"
                                    onClick={handleClearSelection}
                                    role="option"
                                    aria-selected={false}
                                >
                                    <Icon name="close" size={12} />
                                    <span className="active-view-selector__item-name">Clear selection</span>
                                </button>
                            )}
                            {/* On Canvas section */}
                            {filteredOnCanvas.length > 0 && (
                                <div className="active-view-selector__section">
                                    <div className="active-view-selector__section-header">
                                        <Icon name="mapPin" size={12} />
                                        <span>On Canvas</span>
                                    </div>
                                    {filteredOnCanvas.map((view, index) => {
                                        const isActive = activeView?.id === view.id;
                                        const viewColor = view?.color || getViewColor(view.id, index);

                                        return (
                                            <button
                                                key={view.id}
                                                type="button"
                                                className={`active-view-selector__item ${isActive ? 'active-view-selector__item--active' : ''}`}
                                                onClick={() => handleSelect(view)}
                                                role="option"
                                                aria-selected={isActive}
                                                style={{ '--view-color': viewColor }}
                                            >
                                                <span
                                                    className="active-view-selector__item-dot"
                                                    style={{ background: viewColor }}
                                                />
                                                <span className="active-view-selector__item-name">{view.name}</span>
                                                {view.position && (
                                                    <span className="active-view-selector__item-position">
                                                        {formatGridPosition(view.position.col, view.position.row)}
                                                    </span>
                                                )}
                                                {isActive && <Icon name="check" size={12} className="active-view-selector__item-check" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Available Views section */}
                            {filteredAvailable.length > 0 && (
                                <div className="active-view-selector__section">
                                    <div className="active-view-selector__section-header">
                                        <Icon name="eye" size={10} />
                                        <span>Available to Place</span>
                                    </div>
                                    {filteredAvailable.map((view, index) => {
                                        const viewColor = view?.color || getViewColor(view.id, index + onCanvasViews.length);

                                        return (
                                            <button
                                                key={view.id}
                                                type="button"
                                                className="active-view-selector__item active-view-selector__item--available"
                                                onClick={() => handlePlace(view)}
                                                role="option"
                                                aria-selected={false}
                                                style={{ '--view-color': viewColor }}
                                            >
                                                <span
                                                    className="active-view-selector__item-dot"
                                                    style={{ background: viewColor, opacity: 0.6 }}
                                                />
                                                <span className="active-view-selector__item-name">{view.name}</span>
                                                <Icon name="add" size={10} className="active-view-selector__item-add" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Empty state */}
                            {filteredOnCanvas.length === 0 && filteredAvailable.length === 0 && (
                                <div className="active-view-selector__empty">
                                    {searchQuery ? 'No matching views' : 'No views available'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DropdownPortal>
        </div>
    );
}
