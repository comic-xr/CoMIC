// src/ui/react/components/panels/SubsetCard.jsx
// Card component for displaying a single subset
//
// Shows subset info, placement count, and actions

import React, { useState, useCallback } from 'react';
import { subsetManager } from '@Core/data/managers/SubsetManager.js';
import { Icon } from '@UI/react/components/atoms/Icon';
import './SubsetCard.scss';

/**
 * SubsetCard - Displays a subset with actions
 */
export function SubsetCard({
    subset,
    isActive = false,
    isExpanded = false,
    onToggleExpand,
    onEnterFocus,
    onExitFocus,
    disabled = false,
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(subset.name);
    const [showShareMenu, setShowShareMenu] = useState(false);

    // Handle name edit
    const handleSaveName = useCallback(async () => {
        if (editName.trim() && editName !== subset.name) {
            await subsetManager.updateSubset(subset.id, { name: editName.trim() });
        }
        setIsEditing(false);
    }, [subset.id, subset.name, editName]);

    // Handle visibility change
    const handleVisibilityChange = useCallback(
        async (visibility) => {
            await subsetManager.updateSubset(subset.id, { visibility });
            setShowShareMenu(false);
        },
        [subset.id]
    );

    // Handle delete
    const handleDelete = useCallback(async () => {
        if (window.confirm(`Delete "${subset.name}"? This cannot be undone.`)) {
            await subsetManager.deleteSubset(subset.id);
        }
    }, [subset.id, subset.name]);

    // Get visibility icon
    const getVisibilityIcon = () => {
        switch (subset.visibility) {
            case 'private':
                return <Icon name="lock" size={12} />;
            case 'shared':
                return <Icon name="users" size={12} />;
            case 'public':
                return <Icon name="globe" size={12} />;
            default:
                return <Icon name="lock" size={12} />;
        }
    };

    return (
        <div
            className={`subset-card ${isActive ? 'subset-card--active' : ''} ${disabled ? 'subset-card--disabled' : ''
                } ${isExpanded ? 'subset-card--expanded' : ''}`}
        >
            {/* Header */}
            <div className="subset-card__header" onClick={onToggleExpand}>
                <div className="subset-card__info">
                    {isEditing ? (
                        <input
                            className="subset-card__name-input"
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    ) : (
                        <span className="subset-card__name">{subset.name}</span>
                    )}
                    <span className="subset-card__meta">
                        <span className="subset-card__count">
                            {subset.placementIds.length} view
                            {subset.placementIds.length !== 1 ? 's' : ''}
                        </span>
                        <span className="subset-card__visibility" title={subset.visibility}>
                            {getVisibilityIcon()}
                        </span>
                    </span>
                </div>
                <div className="subset-card__toggle">
                    <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={12} />
                </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div className="subset-card__content">
                    {/* Description */}
                    {subset.description && (
                        <p className="subset-card__description">{subset.description}</p>
                    )}

                    {/* Attached content */}
                    {subset.hasAttachedContent() && (
                        <div className="subset-card__attached">
                            {subset.attachedNotes.length > 0 && (
                                <span className="subset-card__attached-item">
                                    <Icon name="fileText" size={12} /> {subset.attachedNotes.length} note
                                    {subset.attachedNotes.length !== 1 ? 's' : ''}
                                </span>
                            )}
                            {subset.attachedImages.length > 0 && (
                                <span className="subset-card__attached-item">
                                    <Icon name="image" size={12} /> {subset.attachedImages.length} image
                                    {subset.attachedImages.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="subset-card__actions">
                        {isActive ? (
                            <button
                                className="subset-card__btn subset-card__btn--exit"
                                onClick={onExitFocus}
                            >
                                Exit Focus
                            </button>
                        ) : (
                            <button
                                className="subset-card__btn subset-card__btn--focus"
                                onClick={onEnterFocus}
                                disabled={disabled}
                            >
                                Enter Focus
                            </button>
                        )}

                        <div className="subset-card__more-actions">
                            <button
                                className="subset-card__btn subset-card__btn--icon"
                                onClick={() => setIsEditing(true)}
                                title="Rename"
                            >
                                <Icon name="edit" size={14} />
                            </button>
                            <button
                                className="subset-card__btn subset-card__btn--icon"
                                onClick={() => setShowShareMenu(!showShareMenu)}
                                title="Share"
                            >
                                {getVisibilityIcon()}
                            </button>
                            <button
                                className="subset-card__btn subset-card__btn--icon subset-card__btn--danger"
                                onClick={handleDelete}
                                title="Delete"
                            >
                                <Icon name="trash" size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Share menu */}
                    {showShareMenu && (
                        <div className="subset-card__share-menu">
                            <button
                                className={subset.visibility === 'private' ? 'active' : ''}
                                onClick={() => handleVisibilityChange('private')}
                            >
                                <Icon name="lock" size={12} /> Private
                            </button>
                            <button
                                className={subset.visibility === 'shared' ? 'active' : ''}
                                onClick={() => handleVisibilityChange('shared')}
                            >
                                <Icon name="users" size={12} /> Team
                            </button>
                            <button
                                className={subset.visibility === 'public' ? 'active' : ''}
                                onClick={() => handleVisibilityChange('public')}
                            >
                                <Icon name="globe" size={12} /> Everyone
                            </button>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="subset-card__metadata">
                        <span>Created by {subset.createdBy || 'Unknown'}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SubsetCard;