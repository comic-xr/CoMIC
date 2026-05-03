/**
 * @file ViewSettingsModal.jsx
 * @description Comprehensive settings modal for ViewItem configuration.
 * Uses the base Modal component for consistent styling and behavior.
 *
 * Features:
 * - Inline name editing with double-click
 * - Quick action toggles (star, save state, lock)
 * - Multiple collapsible sections
 * - Sharing management
 * - Canvas size selection
 * - Link properties configuration (integrated with ViewLinkingService)
 * - Annotation display filters
 * - Display options
 * - Danger zone with delete
 *
 * @example
 * <ViewSettingsModal
 *   isOpen={showSettings}
 *   view={selectedView}
 *   dataset={viewDataset}
 *   onClose={() => setShowSettings(false)}
 *   onRename={handleRename}
 *   onTrash={handleDelete}
 * />
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Icon, IconButton, Toggle } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { getIconComponent } from '@UI/react/components/atoms/Icon';

import { Modal } from '@UI/react/components/modals/Modal';
import { viewLinkingService, LINKING_EVENTS, eventBus } from '@Services';

import './ViewSettingsModal.scss';

// Link property configuration - matches LINKABLE_PROPERTIES in ViewLinkingService
const LINK_PROPERTIES = [
    { id: 'camera', icon: 'camera', label: 'Camera', desc: 'Sync view angle & zoom', color: 'teal' },
    { id: 'filters', icon: 'sliders', label: 'Filters', desc: 'Sync active filters', color: 'purple' },
    { id: 'colorMaps', icon: 'palette', label: 'Colors', desc: 'Sync color mapping', color: 'pink' },
    { id: 'widgets', icon: 'layout', label: 'Widgets', desc: 'Sync widget states', color: 'amber' },
    { id: 'cursors', icon: 'crosshair', label: 'Cursors', desc: 'Show collaborator cursors', color: 'blue' },
    { id: 'annotationDisplay', icon: 'eye', label: 'Annotations', desc: 'Sync annotation visibility', color: 'green' },
];

// Link mode labels
const LINK_MODE_LABELS = {
    none: 'Not Linked',
    follow: 'Follow',
    bidirectional: 'Bidirectional',
    broadcast: 'Broadcast',
};

export function ViewSettingsModal({
    isOpen,
    view,
    dataset,
    availableViews = [],
    sharedUsers = [],
    onClose,
    onRename,
    onStarWorkspace,
    onStarPersonal,
    onSaveState,
    onLoadState,
    onLock,
    onShare,
    onUpdateSharing,
    onSizeChange,
    onLinkPropertyChange,
    onAnnotationFilterChange,
    onDisplayOptionChange,
    onTrash,
}) {
    // Local state for editing
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(view?.name || '');
    const [localSharedUsers, setLocalSharedUsers] = useState(sharedUsers);
    const [newShareEmail, setNewShareEmail] = useState('');
    const nameInputRef = useRef(null);

    // Link state - fetched from ViewLinkingService
    const [linkedProperties, setLinkedProperties] = useState({});
    const [isViewLinked, setIsViewLinked] = useState(false);

    // Fetch link state from ViewLinkingService
    useEffect(() => {
        if (!view?.id || !isOpen) return;

        const updateLinkState = () => {
            const linked = viewLinkingService.getLinkedProperties(view.id);
            setLinkedProperties(linked);
            setIsViewLinked(viewLinkingService.isViewLinked(view.id));
        };

        // Initial fetch
        updateLinkState();

        // Subscribe to link events
        const handlers = [
            eventBus.on(LINKING_EVENTS.PROPERTY_LINKED, updateLinkState),
            eventBus.on(LINKING_EVENTS.PROPERTY_UNLINKED, updateLinkState),
            eventBus.on(LINKING_EVENTS.VIEWS_LINKED, updateLinkState),
            eventBus.on(LINKING_EVENTS.VIEWS_UNLINKED, updateLinkState),
        ];

        return () => handlers.forEach(off => off());
    }, [view?.id, isOpen]);

    // Handler to unlink a single property
    const handleUnlinkProperty = useCallback((propertyId) => {
        if (!view?.id) return;
        viewLinkingService.unlinkProperty(view.id, propertyId);
    }, [view?.id]);

    // Handler to unlink all properties
    const handleUnlinkAll = useCallback(() => {
        if (!view?.id) return;
        viewLinkingService.unlinkViewFully(view.id);
    }, [view?.id]);

    // Handler to change link mode for a property
    const handleChangeLinkMode = useCallback((propertyId, newMode) => {
        if (!view?.id) return;
        const currentLink = linkedProperties[propertyId];
        if (!currentLink) return;

        // Re-link with new mode
        viewLinkingService.linkProperty(view.id, propertyId, currentLink.sourceViewId, newMode);
    }, [view?.id, linkedProperties]);

    // Count linked properties
    const linkedCount = useMemo(() => {
        return Object.keys(linkedProperties).filter(key => linkedProperties[key]).length;
    }, [linkedProperties]);

    // Extract dataset info from view or dataset prop
    const datasetInfo = useMemo(() => {
        if (dataset && dataset.name && dataset.name !== 'Unknown') {
            return dataset;
        }

        // Try to extract from view name (e.g., "View of LungVessels.vtp" -> "LungVessels.vtp")
        let name = 'Unknown Dataset';
        if (view.datasetName) {
            name = view.datasetName;
        } else if (view.filename) {
            name = view.filename;
        } else if (view.name) {
            // Extract from "View of X" pattern
            const match = view.name.match(/^View of (.+)$/i);
            if (match) {
                name = match[1];
            } else {
                name = view.name;
            }
        }

        return {
            name,
            dimensions: view.dimensions || dataset?.dimensions || '---',
            size: view.size || dataset?.size || '---',
            type: view.instanceType || view.type || dataset?.type || 'VTK',
        };
    }, [view, dataset]);

    // Focus input when editing name
    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    // Handlers
    const handleNameSubmit = () => {
        if (editName.trim() && editName !== view.name) {
            onRename?.(editName.trim());
        } else {
            setEditName(view.name);
        }
        setIsEditingName(false);
    };

    const handleAddShare = () => {
        if (newShareEmail.trim()) {
            const newUser = {
                id: Date.now(),
                name: newShareEmail.split('@')[0],
                email: newShareEmail,
                role: 'Viewer',
            };
            const updated = [...localSharedUsers, newUser];
            setLocalSharedUsers(updated);
            onUpdateSharing?.(updated);
            setNewShareEmail('');
        }
    };

    const handleRemoveShare = (userId) => {
        const updated = localSharedUsers.filter(u => u.id !== userId);
        setLocalSharedUsers(updated);
        onUpdateSharing?.(updated);
    };

    const handleRoleChange = (userId, role) => {
        const updated = localSharedUsers.map(u =>
            u.id === userId ? { ...u, role } : u
        );
        setLocalSharedUsers(updated);
        onUpdateSharing?.(updated);
    };

    // ---------------------------------------------------------------------------
    // RENDER FOOTER
    // ---------------------------------------------------------------------------

    const renderFooter = () => (
        <LabeledButton label="Close" onClick={onClose} variant="ghost" />
    );

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="View Settings"
            icon="settings"
            size="md"
            footer={renderFooter()}
        >
            <div className="view-settings-modal">
                {/* Editable Name Section */}
                <div className="view-settings-modal__name-section">
                    {isEditingName ? (
                        <input
                            ref={nameInputRef}
                            type="text"
                            className="view-settings-modal__name-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleNameSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNameSubmit();
                                if (e.key === 'Escape') {
                                    setEditName(view.name);
                                    setIsEditingName(false);
                                }
                            }}
                        />
                    ) : (
                        <div
                            className="view-settings-modal__name"
                            onDoubleClick={() => setIsEditingName(true)}
                            title="Double-click to rename"
                        >
                            <span>{editName}</span>
                            <Icon name='pencil' size={10} className="view-settings-modal__name-hint" />
                        </div>
                    )}
                    <span className="view-settings-modal__subtitle">
                        {isEditingName ? 'Press Enter to save' : 'Double-click to rename'}
                    </span>
                </div>

                {/* Quick Actions Bar */}
                <div className="view-settings-modal__quick-actions">
                    <span className="view-settings-modal__quick-label">Quick Actions:</span>
                    <QuickToggle
                        icon="folder"
                        label="Workspace"
                        active={view.starredWorkspace}
                        activeColor="purple"
                        onClick={onStarWorkspace}
                    />
                    <QuickToggle
                        icon="globe"
                        label="Personal"
                        active={view.starredPersonal}
                        activeColor="amber"
                        onClick={onStarPersonal}
                    />
                    <div className="view-settings-modal__quick-divider" />
                    <QuickToggle
                        icon="save"
                        label="Save State"
                        active={view.hasSavedState}
                        activeColor="amber"
                        onClick={onSaveState}
                    />
                    <QuickToggle
                        icon="sync"
                        label="Load State"
                        onClick={onLoadState}
                    />
                    <div className="view-settings-modal__quick-divider" />
                    <QuickToggle
                        icon="lock"
                        label="Lock"
                        active={view.isLocked}
                        activeColor="amber"
                        onClick={onLock}
                    />
                </div>

                {/* Sections */}
                <div className="view-settings-modal__sections">
                    {/* Source Dataset */}
                    <ModalSection icon="layers" title="Source Dataset">
                        <div className="view-settings-modal__dataset">
                            <div className="view-settings-modal__dataset-icon">
                                <Icon name="layers" size={18} />
                            </div>
                            <div className="view-settings-modal__dataset-info">
                                <div className="view-settings-modal__dataset-name">
                                    {datasetInfo.name}
                                </div>
                                <div className="view-settings-modal__dataset-meta">
                                    {datasetInfo.dimensions} • {datasetInfo.size} • {datasetInfo.type}
                                </div>
                            </div>
                            <LabeledButton
                                icon="externalLink"
                                label="Open"
                                size="sm"
                                variant="ghost"
                            />
                        </div>
                    </ModalSection>

                    {/* Sharing */}
                    <ModalSection
                        icon="users"
                        title="Sharing"
                        badge={view.isShared ? `${localSharedUsers.length} people` : 'Private'}
                    >
                        {!view.isShared ? (
                            <div className="view-settings-modal__sharing-private">
                                <p>This view is private. Share it to collaborate.</p>
                                <LabeledButton
                                    icon="users"
                                    label="Share View"
                                    onClick={onShare}
                                    variant="secondary"
                                />
                            </div>
                        ) : (
                            <div className="view-settings-modal__sharing">
                                {/* Add people */}
                                <div className="view-settings-modal__share-input-row">
                                    <input
                                        type="email"
                                        placeholder="Add people by email..."
                                        className="view-settings-modal__share-input"
                                        value={newShareEmail}
                                        onChange={(e) => setNewShareEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddShare()}
                                    />
                                    <LabeledButton
                                        label="Add"
                                        onClick={handleAddShare}
                                        size="sm"
                                        variant="primary"
                                    />
                                </div>

                                {/* Shared users list */}
                                <div className="view-settings-modal__share-list">
                                    {localSharedUsers.map(user => (
                                        <div key={user.id} className="view-settings-modal__share-user">
                                            <div
                                                className={`view-settings-modal__share-avatar ${user.isGroup ? 'view-settings-modal__share-avatar--group' : ''}`}
                                            >
                                                {user.avatar || user.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="view-settings-modal__share-user-info">
                                                <div className="view-settings-modal__share-user-name">{user.name}</div>
                                                <div className="view-settings-modal__share-user-email">{user.email}</div>
                                            </div>
                                            <select
                                                className="view-settings-modal__share-role"
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            >
                                                <option value="Editor">Editor</option>
                                                <option value="Viewer">Viewer</option>
                                                <option value="Can Share">Can Share</option>
                                            </select>
                                            <IconButton
                                                icon="close"
                                                onClick={() => handleRemoveShare(user.id)}
                                                size="sm"
                                                variant="ghost"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <LabeledButton
                                    label="Stop Sharing (Make Private)"
                                    onClick={() => {
                                        setLocalSharedUsers([]);
                                        onUpdateSharing?.([]);
                                    }}
                                    variant="ghost"
                                    color="red"
                                />
                            </div>
                        )}
                    </ModalSection>

                    {/* Canvas Size */}
                    <ModalSection icon="maximize" title="Canvas Size">
                        <div className="view-settings-modal__size-grid">
                            {[1, 2, 3].map(row =>
                                [1, 2, 3].map(col => (
                                    <button
                                        key={`${row}x${col}`}
                                        className={`view-settings-modal__size-btn ${row === (view.rowSpan || 1) && col === (view.colSpan || 1)
                                            ? 'view-settings-modal__size-btn--active'
                                            : ''
                                            }`}
                                        onClick={() => onSizeChange?.({ rows: row, cols: col })}
                                    >
                                        {row}×{col}
                                    </button>
                                ))
                            )}
                        </div>
                    </ModalSection>

                    {/* Link Properties */}
                    <ModalSection
                        icon="link2"
                        title="Link Properties"
                        badge={linkedCount > 0 ? `${linkedCount} linked` : null}
                    >
                        {linkedCount > 0 ? (
                            <>
                                <div className="view-settings-modal__link-info">
                                    <Icon name="info" size={12} />
                                    <span>
                                        This view has {linkedCount} linked {linkedCount === 1 ? 'property' : 'properties'}.
                                        Changes to linked properties will sync with the source view.
                                    </span>
                                </div>
                                <div className="view-settings-modal__links">
                                    {LINK_PROPERTIES.map(prop => {
                                        const linkData = linkedProperties[prop.id];
                                        const isLinked = !!linkData;
                                        const sourceViewName = linkData?.sourceViewId
                                            ? availableViews.find(v => v.id === linkData.sourceViewId)?.name || 'Unknown View'
                                            : null;

                                        return (
                                            <div
                                                key={prop.id}
                                                className={`view-settings-modal__link-row ${isLinked ? 'view-settings-modal__link-row--linked' : ''}`}
                                            >
                                                <div className="view-settings-modal__link-icon" data-color={prop.color}>
                                                    <Icon name={prop.icon} size={12} />
                                                </div>
                                                <div className="view-settings-modal__link-content">
                                                    <span className="view-settings-modal__link-label">{prop.label}</span>
                                                    {isLinked ? (
                                                        <span className="view-settings-modal__link-source">
                                                            Linked to: {sourceViewName}
                                                        </span>
                                                    ) : (
                                                        <span className="view-settings-modal__link-desc">{prop.desc}</span>
                                                    )}
                                                </div>
                                                {isLinked ? (
                                                    <div className="view-settings-modal__link-actions">
                                                        <select
                                                            className="view-settings-modal__link-mode"
                                                            value={linkData.mode || 'bidirectional'}
                                                            onChange={(e) => handleChangeLinkMode(prop.id, e.target.value)}
                                                            title="Link mode"
                                                        >
                                                            <option value="follow">Follow</option>
                                                            <option value="bidirectional">Bidirectional</option>
                                                            <option value="broadcast">Broadcast</option>
                                                        </select>
                                                        <IconButton
                                                            icon="unlink"
                                                            onClick={() => handleUnlinkProperty(prop.id)}
                                                            tooltip="Unlink this property"
                                                            size="sm"
                                                            variant="ghost"
                                                        />
                                                    </div>
                                                ) : (
                                                    <select
                                                        className="view-settings-modal__link-select"
                                                        value=""
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                viewLinkingService.linkProperty(
                                                                    view.id,
                                                                    prop.id,
                                                                    e.target.value,
                                                                    'bidirectional'
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <option value="">Not linked</option>
                                                        {availableViews
                                                            .filter(v => v.id !== view.id)
                                                            .map(v => (
                                                                <option key={v.id} value={v.id}>{v.name}</option>
                                                            ))
                                                        }
                                                    </select>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <LabeledButton
                                    icon="unlink"
                                    label="Unlink All Properties"
                                    onClick={handleUnlinkAll}
                                    variant="ghost"
                                    color="red"
                                />
                            </>
                        ) : (
                            <>
                                <div className="view-settings-modal__link-empty">
                                    <Icon name="link2" size={24} />
                                    <p>No linked properties</p>
                                    <span>Link properties to sync camera, filters, and more with another view.</span>
                                </div>
                                <div className="view-settings-modal__links">
                                    {LINK_PROPERTIES.map(prop => (
                                        <div key={prop.id} className="view-settings-modal__link-row">
                                            <div className="view-settings-modal__link-icon" data-color={prop.color}>
                                                <Icon name={prop.icon} size={12} />
                                            </div>
                                            <div className="view-settings-modal__link-content">
                                                <span className="view-settings-modal__link-label">{prop.label}</span>
                                                <span className="view-settings-modal__link-desc">{prop.desc}</span>
                                            </div>
                                            <select
                                                className="view-settings-modal__link-select"
                                                value=""
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        viewLinkingService.linkProperty(
                                                            view.id,
                                                            prop.id,
                                                            e.target.value,
                                                            'bidirectional'
                                                        );
                                                    }
                                                }}
                                            >
                                                <option value="">Link to...</option>
                                                {availableViews
                                                    .filter(v => v.id !== view.id)
                                                    .map(v => (
                                                        <option key={v.id} value={v.id}>{v.name}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </ModalSection>

                    {/* Annotation Display */}
                    <ModalSection icon="target" title="Annotation Display" badge="Dataset Level">
                        <div className="view-settings-modal__note view-settings-modal__note--info">
                            Annotations belong to the <strong>Dataset</strong>. This view can filter which annotations to display.
                        </div>
                        <div className="view-settings-modal__annotation-filters">
                            <ToggleRow
                                label="Show My Annotations"
                                checked={view.annotationFilters?.showMine !== false}
                                onChange={(checked) => onAnnotationFilterChange?.('showMine', checked)}
                            />
                            <ToggleRow
                                label="Show Team Annotations"
                                checked={view.annotationFilters?.showTeam !== false}
                                onChange={(checked) => onAnnotationFilterChange?.('showTeam', checked)}
                            />
                            <ToggleRow
                                label="Show Verified Only"
                                checked={view.annotationFilters?.verifiedOnly === true}
                                onChange={(checked) => onAnnotationFilterChange?.('verifiedOnly', checked)}
                            />
                        </div>
                        <div className="view-settings-modal__annotation-copy">
                            <span>Copy annotation filters from:</span>
                            <div className="view-settings-modal__annotation-copy-row">
                                <select className="view-settings-modal__annotation-select">
                                    <option>Select a view...</option>
                                    {availableViews
                                        .filter(v => v.id !== view.id)
                                        .map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))
                                    }
                                </select>
                                <LabeledButton
                                    icon="copy"
                                    label="Copy"
                                    size="sm"
                                    variant="ghost"
                                />
                            </div>
                        </div>
                    </ModalSection>

                    {/* Display Options (Handler-specific) */}
                    <ModalSection icon="palette" title="Display Options" badge={view.instanceType || 'VTK'}>
                        <div className="view-settings-modal__note view-settings-modal__note--warning">
                            <Icon name="bolt" size={10} />
                            <span>Options from <strong>{view.instanceType || 'VTK'}InstanceHandler</strong> — varies by type</span>
                        </div>
                        <div className="view-settings-modal__display-options">
                            <ToggleRow
                                label="Show Grid Lines"
                                checked={view.displayOptions?.gridLines === true}
                                onChange={(checked) => onDisplayOptionChange?.('gridLines', checked)}
                            />
                            <ToggleRow
                                label="Orientation Widget"
                                checked={view.displayOptions?.orientationWidget !== false}
                                onChange={(checked) => onDisplayOptionChange?.('orientationWidget', checked)}
                            />
                            <div className="view-settings-modal__color-row">
                                <span>Background</span>
                                <div
                                    className="view-settings-modal__color-swatch"
                                    style={{ background: view.displayOptions?.background || '#1a1a1a' }}
                                />
                            </div>
                        </div>
                        <p className="view-settings-modal__hint">
                            Other instance types (2D Image, Chart, etc.) will show different options.
                        </p>
                    </ModalSection>

                    {/* Advanced (Stub) */}
                    <ModalSection icon="bolt" title="Advanced" badge="Stub">
                        <div className="view-settings-modal__advanced">
                            <div className="view-settings-modal__advanced-row">
                                <Icon name="mousePointer" size={12} />
                                <span>Cursor Style</span>
                                <select disabled>
                                    <option>Crosshair</option>
                                    <option>Sphere</option>
                                    <option>Ring</option>
                                </select>
                            </div>
                            <div className="view-settings-modal__advanced-row">
                                <Icon name="move" size={12} />
                                <span>Interaction Mode</span>
                                <select disabled>
                                    <option>Trackball</option>
                                    <option>Flight</option>
                                    <option>2D Pan/Zoom</option>
                                </select>
                            </div>
                        </div>
                        <div className="view-settings-modal__note">
                            <strong>Future:</strong> Cursor style (3D cursor appearance), Interaction mode (how input maps to camera). May also be handler-specific.
                        </div>
                    </ModalSection>

                    {/* Danger Zone */}
                    <ModalSection icon="trash" title="Danger Zone">
                        <LabeledButton
                            icon="trash"
                            label="Delete View Permanently"
                            onClick={onTrash}
                            variant="primary"
                            color="red"
                        />
                        <p className="view-settings-modal__delete-hint">
                            Moves to Recently Deleted for 30 days.
                        </p>
                    </ModalSection>
                </div>
            </div>
        </Modal>
    );
}

// Quick Toggle Button
function QuickToggle({ icon, label, active, activeColor, onClick }) {
    return (
        <IconButton
            icon={icon}
            onClick={onClick}
            tooltip={label}
            active={active}
            color={active ? activeColor : undefined}
            size="sm"
            variant="ghost"
            className={`view-settings-modal__quick-toggle ${active ? `view-settings-modal__quick-toggle--active view-settings-modal__quick-toggle--${activeColor}` : ''}`}
        />
    );
}

// Modal Section Component
function ModalSection({ icon: Icon, title, badge, children }) {
    return (
        <div className="view-settings-modal__section">
            <div className="view-settings-modal__section-header">
                <Icon size={14} className="view-settings-modal__section-icon" />
                <span className="view-settings-modal__section-title">{title}</span>
                {badge && (
                    <span className="view-settings-modal__section-badge">{badge}</span>
                )}
            </div>
            <div className="view-settings-modal__section-content">
                {children}
            </div>
        </div>
    );
}

// Toggle Row Component
function ToggleRow({ label, checked, onChange }) {
    return (
        <div className="view-settings-modal__toggle-row">
            <span>{label}</span>
            <Toggle
                checked={checked}
                onChange={onChange}
                size="sm"
            />
        </div>
    );
}

export default ViewSettingsModal;