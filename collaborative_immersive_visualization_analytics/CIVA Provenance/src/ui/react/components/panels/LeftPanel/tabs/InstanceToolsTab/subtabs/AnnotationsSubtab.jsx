// AnnotationsSubtab.jsx
// Instance-specific annotations subtab for InstanceToolsTab
//
// FIXED: Uses real annotations from useAnnotations hook
// FIXED: "Open Full Annotations Panel" button is in a proper footer
// FIXED: Renders annotations in 3D view via workspaceManager
// ADDED: Click-to-annotate with floating annotation creator
// ADDED: Right-click context menu for edit/move/delete

import React, { useState, useCallback, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { useAnnotations } from '@UI/react/hooks/useAnnotations.js';
import { FloatingAnnotationCreator } from '@UI/react/components/panels/FloatingPanel/FloatingAnnotationCreator';
import { AnnotationContextMenu } from '@UI/react/components/modals/AnnotationContextMenu';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { logInfo, logSuccess, logWarning } from '@Utils/logger.js';

// =============================================================================
// ANNOTATION TYPE CONFIG
// =============================================================================

const ANNOTATION_TYPES = {
    point: { icon: 'mapPin', label: 'Point', color: 'blue' },
    region: { icon: 'box', label: 'Region', color: 'green' },
    measurement: { icon: 'ruler', label: 'Measure', color: 'amber' },
    angle: { icon: 'arrowUpRight', label: 'Angle', color: 'purple' },
    text: { icon: 'textCursor', label: 'Text', color: 'pink' },
};

// =============================================================================
// ANNOTATION LIST ITEM
// =============================================================================

function AnnotationListItem({ annotation, onToggleVisibility }) {
    const typeConfig = ANNOTATION_TYPES[annotation.type] || ANNOTATION_TYPES.point;
    const Icon = typeConfig.icon;
    const isVisible = annotation.visible !== false;

    return (
        <div className="annotation-list-item">
            <Icon size={14} className={`annotation-list-item__icon icon-${typeConfig.color}`} />
            <div className="annotation-list-item__content">
                <span className="annotation-list-item__text">
                    {annotation.label || annotation.text || `${typeConfig.label} annotation`}
                </span>
                <span className="annotation-list-item__meta">
                    {typeConfig.label} &middot; {annotation.createdBy || 'Unknown'}
                </span>
            </div>
            <button
                className="annotation-list-item__visibility"
                onClick={() => onToggleVisibility?.(annotation)}
                title={isVisible ? 'Hide' : 'Show'}
            >
                {isVisible ? <Icon name="eye" size={12} /> : <Icon name="eyeOff" size={12} />}
            </button>
            <button className="annotation-list-item__more" title="More options">
                <Icon name="moreHorizontal" size={12} />
            </button>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AnnotationsSubtab({ activeInstance, onOpenFullPanel }) {
    // Get the dataset ID and instance ID from the active instance
    const datasetId = activeInstance?.instanceData?.dataset?.id || null;
    const instanceId = activeInstance?.instanceId || null;

    // Floating annotation creator state
    const [showCreator, setShowCreator] = useState(false);
    const [annotationMode, setAnnotationMode] = useState(false);
    const [clickPosition, setClickPosition] = useState({ x: 0, y: 0, z: 0 });
    const [screenPosition, setScreenPosition] = useState({ x: 200, y: 200 });

    // Context menu state
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuAnnotation, setContextMenuAnnotation] = useState(null);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

    // Move mode state
    const [moveMode, setMoveMode] = useState(false);
    const [movingAnnotation, setMovingAnnotation] = useState(null);

    // Edit mode state
    const [editingAnnotation, setEditingAnnotation] = useState(null);

    // Fetch real annotations for this dataset
    const {
        annotations,
        isLoading,
        error,
        createAnnotation,
        updateAnnotation,
        deleteAnnotation,
    } = useAnnotations({ datasetId });

    // Render annotations in 3D view when annotations change
    useEffect(() => {
        if (!instanceId || !annotations) return;

        // Get visible annotations
        const visibleAnnotations = annotations.filter(a => a.visible !== false);

        // Update the VTK instance with annotations
        workspaceManager.updateInstanceAnnotations(instanceId, visibleAnnotations.length > 0, visibleAnnotations)
            .catch(err => {
                logWarning('Failed to render annotations in 3D view');
                console.warn('Annotation render error:', err);
            });
    }, [instanceId, annotations]);

    // Handle annotation mode toggle
    useEffect(() => {
        if (!instanceId) return;

        workspaceManager.setAnnotationMode(instanceId, annotationMode);

        return () => {
            // Disable annotation mode on cleanup
            workspaceManager.setAnnotationMode(instanceId, false);
        };
    }, [instanceId, annotationMode]);

    // Listen for annotation click events (for creating new annotations)
    useEffect(() => {
        const handleAnnotationClick = (event) => {
            const { position, screenX, screenY, instanceId: clickInstanceId } = event.detail;

            if (clickInstanceId !== instanceId || !position) return;

            // If we're in move mode, move the annotation to the new position
            if (moveMode && movingAnnotation) {
                handleMoveAnnotationToPosition(position);
                return;
            }

            // Otherwise, show the creator for a new annotation
            setClickPosition(position);
            setScreenPosition({ x: screenX + 20, y: screenY - 150 });
            setShowCreator(true);
            setAnnotationMode(false); // Exit annotation mode after click
        };

        window.addEventListener('cia:annotation-click', handleAnnotationClick);
        return () => window.removeEventListener('cia:annotation-click', handleAnnotationClick);
    }, [instanceId, moveMode, movingAnnotation]);

    // Listen for annotation context menu events (right-click on annotation)
    useEffect(() => {
        const handleContextMenu = (event) => {
            const { annotation, screenX, screenY, instanceId: clickInstanceId } = event.detail;

            if (clickInstanceId === instanceId && annotation) {
                // Find the full annotation from our list
                const fullAnnotation = annotations.find(a => a.id === annotation.id) || annotation;
                setContextMenuAnnotation(fullAnnotation);
                setContextMenuPosition({ x: screenX, y: screenY });
                setShowContextMenu(true);
            }
        };

        window.addEventListener('cia:annotation-context-menu', handleContextMenu);
        return () => window.removeEventListener('cia:annotation-context-menu', handleContextMenu);
    }, [instanceId, annotations]);

    // Toggle annotation visibility
    const handleToggleVisibility = useCallback(async (annotation) => {
        await updateAnnotation({
            id: annotation.id,
            targetDatasetId: annotation.datasetId,
            updates: { visible: annotation.visible === false }
        });

        // Re-render annotations after visibility change
        if (instanceId) {
            const updatedAnnotations = annotations.map(a =>
                a.id === annotation.id ? { ...a, visible: a.visible === false } : a
            );
            const visibleAnnotations = updatedAnnotations.filter(a => a.visible !== false);
            workspaceManager.updateInstanceAnnotations(instanceId, visibleAnnotations.length > 0, visibleAnnotations);
        }
    }, [updateAnnotation, annotations, instanceId]);

    // Handle edit annotation (opens the creator with existing data)
    const handleEditAnnotation = useCallback(() => {
        if (!contextMenuAnnotation) return;

        // Set up the creator with existing annotation data
        const pos = contextMenuAnnotation.position;
        const position = Array.isArray(pos)
            ? { x: pos[0], y: pos[1], z: pos[2] }
            : pos;

        setClickPosition(position);
        setScreenPosition(contextMenuPosition);
        setEditingAnnotation(contextMenuAnnotation);
        setShowCreator(true);
    }, [contextMenuAnnotation, contextMenuPosition]);

    // Handle start moving an annotation
    const handleStartMoveAnnotation = useCallback(() => {
        if (!contextMenuAnnotation) return;

        setMovingAnnotation(contextMenuAnnotation);
        setMoveMode(true);
        setAnnotationMode(true); // Enable annotation mode to capture clicks

        logInfo(`Move mode enabled. Click on the 3D model to move annotation "${contextMenuAnnotation.label || contextMenuAnnotation.text || 'Annotation'}"`);
    }, [contextMenuAnnotation]);

    // Handle moving annotation to new position
    const handleMoveAnnotationToPosition = useCallback(async (newPosition) => {
        if (!movingAnnotation) return;

        logInfo(`Moving annotation to (${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${newPosition.z.toFixed(2)})`);

        try {
            await updateAnnotation({
                id: movingAnnotation.id,
                targetDatasetId: movingAnnotation.datasetId || datasetId,
                updates: {
                    position: [newPosition.x, newPosition.y, newPosition.z]
                }
            });

            logSuccess('Annotation moved');

            // Re-render annotations with the new position
            if (instanceId) {
                const updatedAnnotations = annotations.map(a =>
                    a.id === movingAnnotation.id
                        ? { ...a, position: [newPosition.x, newPosition.y, newPosition.z] }
                        : a
                );
                const visibleAnnotations = updatedAnnotations.filter(a => a.visible !== false);
                await workspaceManager.updateInstanceAnnotations(instanceId, visibleAnnotations.length > 0, visibleAnnotations);
            }
        } catch (err) {
            console.error('Failed to move annotation:', err);
        } finally {
            // Exit move mode
            setMoveMode(false);
            setMovingAnnotation(null);
            setAnnotationMode(false);
        }
    }, [movingAnnotation, updateAnnotation, datasetId, annotations, instanceId]);

    // Cancel move mode
    const handleCancelMove = useCallback(() => {
        setMoveMode(false);
        setMovingAnnotation(null);
        setAnnotationMode(false);
    }, []);

    // Handle delete annotation
    const handleDeleteAnnotation = useCallback(async () => {
        if (!contextMenuAnnotation) return;

        const confirmDelete = window.confirm(
            `Delete annotation "${contextMenuAnnotation.label || contextMenuAnnotation.text || 'this annotation'}"?`
        );

        if (!confirmDelete) return;

        try {
            await deleteAnnotation({
                id: contextMenuAnnotation.id,
                targetDatasetId: contextMenuAnnotation.datasetId || datasetId,
            });

            logSuccess('Annotation deleted');

            // Re-render annotations without the deleted one
            if (instanceId) {
                const remainingAnnotations = annotations
                    .filter(a => a.id !== contextMenuAnnotation.id && a.visible !== false);
                await workspaceManager.updateInstanceAnnotations(
                    instanceId,
                    remainingAnnotations.length > 0,
                    remainingAnnotations
                );
            }
        } catch (err) {
            console.error('Failed to delete annotation:', err);
        }
    }, [contextMenuAnnotation, deleteAnnotation, datasetId, annotations, instanceId]);

    // Handle creating or updating an annotation with position
    const handleCreateAnnotation = useCallback(async (text, type, position) => {
        if (!datasetId) {
            console.warn('No dataset ID available for annotation');
            return;
        }

        const positionArray = [position.x, position.y, position.z];

        // If editing an existing annotation, update it
        if (editingAnnotation) {
            logInfo(`Updating annotation: ${editingAnnotation.id}`);

            try {
                await updateAnnotation({
                    id: editingAnnotation.id,
                    targetDatasetId: editingAnnotation.datasetId || datasetId,
                    updates: {
                        text,
                        type: type === 'note' ? 'point' : type,
                        position: positionArray,
                        label: text.substring(0, 50),
                    }
                });

                logSuccess('Annotation updated');
                setShowCreator(false);
                setEditingAnnotation(null);

                // Re-render annotations with the updated data
                if (instanceId) {
                    const updatedAnnotations = annotations.map(a =>
                        a.id === editingAnnotation.id
                            ? { ...a, text, type: type === 'note' ? 'point' : type, position: positionArray, label: text.substring(0, 50) }
                            : a
                    ).filter(a => a.visible !== false);
                    await workspaceManager.updateInstanceAnnotations(instanceId, updatedAnnotations.length > 0, updatedAnnotations);
                }
            } catch (err) {
                console.error('Failed to update annotation:', err);
            }
            return;
        }

        // Creating a new annotation
        logInfo(`Creating annotation: ${type} at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);

        try {
            const newAnnotation = await createAnnotation({
                targetDatasetId: datasetId,
                type: type === 'note' ? 'point' : type,
                text,
                position: positionArray,
                label: text.substring(0, 50),
            });
            logSuccess('Annotation created');
            console.log('[DEBUG] New annotation returned:', newAnnotation);
            setShowCreator(false);

            // Immediately render the new annotation in the 3D view
            if (instanceId && newAnnotation) {
                const allAnnotations = [...annotations, newAnnotation].filter(a => a.visible !== false);
                console.log('[DEBUG] Rendering annotations:', allAnnotations.length, 'annotations');
                console.log('[DEBUG] Annotation positions:', allAnnotations.map(a =>
                    Array.isArray(a.position) ? a.position : [a.position?.x, a.position?.y, a.position?.z]
                ));
                await workspaceManager.updateInstanceAnnotations(instanceId, true, allAnnotations);
                logSuccess(`Rendered ${allAnnotations.length} annotation(s) in 3D view`);
            } else {
                console.warn('[DEBUG] Cannot render: instanceId=', instanceId, 'newAnnotation=', !!newAnnotation);
            }
        } catch (err) {
            console.error('Failed to create annotation:', err);
        }
    }, [datasetId, createAnnotation, updateAnnotation, instanceId, annotations, editingAnnotation]);

    // Handle position change from the floating creator
    const handlePositionChange = useCallback((newPosition) => {
        setClickPosition(newPosition);
    }, []);

    // Start click-to-annotate mode
    const handleStartAnnotating = useCallback(() => {
        setAnnotationMode(true);
        logInfo('Click-to-annotate mode enabled. Click on the 3D model to place an annotation.');
    }, []);

    // Handle opening the full panel
    const handleOpenFullPanel = useCallback(() => {
        // Dispatch event to open the annotations tab in main panel
        window.dispatchEvent(new CustomEvent('cia:open-panel', {
            detail: { panel: 'annotations' }
        }));
        onOpenFullPanel?.();
    }, [onOpenFullPanel]);

    return (
        <div className="annotations-subtab">
            <div className="annotations-subtab__info">
                Annotations on this instance only. For all annotations, use the global Annotations panel.
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="annotations-subtab__loading">
                    <Icon name="loader" size={16} className="spin" />
                    <span>Loading...</span>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="annotations-subtab__error">
                    <span>Failed to load annotations</span>
                </div>
            )}

            {/* Content */}
            {!isLoading && !error && (
                <>
                    {annotations.length === 0 ? (
                        <div className="annotations-subtab__empty">
                            <Icon name="mapPin" size={24} />
                            <p>No annotations on this instance</p>
                            <span>Use the annotation tool to add markers</span>
                        </div>
                    ) : (
                        <div className="annotations-subtab__list">
                            {annotations.map(ann => (
                                <AnnotationListItem
                                    key={ann.id}
                                    annotation={ann}
                                    onToggleVisibility={handleToggleVisibility}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Footer - fixed to bottom of subtab */}
            <div className="panel-footer">
                <LabeledButton
                    icon="crosshair"
                    label={annotationMode ? 'Click model...' : 'Click to Add'}
                    onClick={handleStartAnnotating}
                    disabled={!datasetId || annotationMode}
                    active={annotationMode}
                    size="sm"
                    tooltip="Click on the 3D model to add annotation"
                />
                <LabeledButton
                    icon="arrowUpRight"
                    label="Open Panel"
                    onClick={handleOpenFullPanel}
                    size="sm"
                    variant="ghost"
                />
            </div>

            {/* Annotation mode indicator - for creating new annotations */}
            {annotationMode && !moveMode && (
                <div className="annotations-subtab__mode-indicator">
                    <Icon name="crosshair" size={12} className="pulse" />
                    <span>Click on the 3D model to place annotation</span>
                    <button onClick={() => setAnnotationMode(false)}>Cancel</button>
                </div>
            )}

            {/* Move mode indicator */}
            {moveMode && movingAnnotation && (
                <div className="annotations-subtab__mode-indicator annotations-subtab__mode-indicator--move">
                    <Icon name="move" size={12} className="pulse" />
                    <span>Click to move: {movingAnnotation.label || movingAnnotation.text || 'Annotation'}</span>
                    <button onClick={handleCancelMove}>Cancel</button>
                </div>
            )}

            {/* Floating Annotation Creator */}
            <FloatingAnnotationCreator
                isOpen={showCreator}
                onClose={() => {
                    setShowCreator(false);
                    setEditingAnnotation(null);
                }}
                onSubmit={handleCreateAnnotation}
                position={clickPosition}
                screenPosition={screenPosition}
                onPositionChange={handlePositionChange}
            />

            {/* Annotation Context Menu */}
            <AnnotationContextMenu
                isOpen={showContextMenu}
                onClose={() => setShowContextMenu(false)}
                annotation={contextMenuAnnotation}
                screenPosition={contextMenuPosition}
                onEdit={handleEditAnnotation}
                onMove={handleStartMoveAnnotation}
                onDelete={handleDeleteAnnotation}
                onToggleVisibility={() => handleToggleVisibility(contextMenuAnnotation)}
            />
        </div>
    );
}

export default AnnotationsSubtab;