/**
 * @file MergeConflictPicker.jsx
 * @description Modal for choosing which view to keep when merging canvas cells
 * that contain multiple views.
 *
 * Features:
 * - Grid of selectable view cards
 * - Radio options for displaced view behavior
 * - Remember choice checkbox for session
 * - Keyboard navigation with arrow keys
 * - Full accessibility support
 *
 * @example
 * <MergeConflictPicker
 *   isOpen={showPicker}
 *   onClose={() => setShowPicker(false)}
 *   views={conflictingViews}
 *   onMerge={handleMergeDecision}
 * />
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import { Modal } from '../Modal';
import { Button } from '@UI/react/components/atoms/Button';
import ViewCard from './ViewCard';
import './MergeConflictPicker.scss';

/**
 * Displaced view options configuration
 */
const DISPLACED_OPTIONS = [
    {
        value: 'close',
        label: 'Close (Move to Not Placed)',
        description: 'Views will be removed from canvas but remain in your views list',
        icon: Archive,
    },
    {
        value: 'autoflow',
        label: 'Autoflow to available cells',
        description: 'Views will be placed in the nearest empty cells',
        icon: LayoutGrid,
    },
];

/**
 * @typedef {Object} ViewOption
 * @property {string} id - View ID
 * @property {string} name - View name
 * @property {string} [thumbnail] - Thumbnail URL
 * @property {string} datasetName - Parent dataset name
 * @property {string} type - View type (e.g., "Volume", "Surface")
 * @property {string} color - View accent color
 */

/**
 * @typedef {Object} MergeResult
 * @property {string} keepViewId - ID of view to keep in merged cell
 * @property {'close'|'autoflow'} displacedAction - What to do with other views
 * @property {boolean} rememberChoice - Whether to remember this preference
 */

/**
 * @typedef {Object} MergeConflictPickerProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Close handler (cancel)
 * @property {ViewOption[]} views - Views to choose from
 * @property {(result: MergeResult) => void} onMerge - Called with merge decision
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Merge conflict picker modal.
 *
 * @param {MergeConflictPickerProps} props - Component props
 * @returns {React.ReactElement} The rendered modal
 */
function MergeConflictPicker({
    isOpen,
    onClose,
    views = [],
    onMerge,
    className = '',
    testId
}) {
    // State
    const [selectedViewId, setSelectedViewId] = useState(null);
    const [displacedAction, setDisplacedAction] = useState('autoflow');
    const [rememberChoice, setRememberChoice] = useState(false);

    // Refs for keyboard navigation
    const viewCardsRef = useRef([]);
    const focusedIndexRef = useRef(0);

    /**
     * Reset state when modal opens
     */
    useEffect(() => {
        if (isOpen) {
            setSelectedViewId(null);
            setDisplacedAction('autoflow');
            setRememberChoice(false);
            focusedIndexRef.current = 0;
        }
    }, [isOpen]);

    /**
     * Handle view selection
     */
    const handleViewSelect = useCallback((viewId) => {
        setSelectedViewId(viewId);
    }, []);

    /**
     * Handle displaced action change
     */
    const handleDisplacedActionChange = useCallback((value) => {
        setDisplacedAction(value);
    }, []);

    /**
     * Handle remember choice toggle
     */
    const handleRememberToggle = useCallback(() => {
        setRememberChoice(prev => !prev);
    }, []);

    /**
     * Handle merge button click
     */
    const handleMerge = useCallback(() => {
        if (!selectedViewId) return;

        onMerge({
            keepViewId: selectedViewId,
            displacedAction,
            rememberChoice,
        });
    }, [selectedViewId, displacedAction, rememberChoice, onMerge]);

    /**
     * Handle keyboard navigation between view cards
     */
    const handleViewKeyDown = useCallback((event, currentIndex) => {
        const { key } = event;
        let nextIndex = currentIndex;

        switch (key) {
            case 'ArrowRight':
                event.preventDefault();
                nextIndex = currentIndex + 1;
                if (nextIndex >= views.length) nextIndex = 0;
                break;

            case 'ArrowLeft':
                event.preventDefault();
                nextIndex = currentIndex - 1;
                if (nextIndex < 0) nextIndex = views.length - 1;
                break;

            case 'ArrowDown':
                event.preventDefault();
                // Move down in grid (assuming ~2-3 columns)
                nextIndex = Math.min(currentIndex + 2, views.length - 1);
                break;

            case 'ArrowUp':
                event.preventDefault();
                nextIndex = Math.max(currentIndex - 2, 0);
                break;

            case 'Home':
                event.preventDefault();
                nextIndex = 0;
                break;

            case 'End':
                event.preventDefault();
                nextIndex = views.length - 1;
                break;

            default:
                return;
        }

        if (nextIndex !== currentIndex) {
            focusedIndexRef.current = nextIndex;
            viewCardsRef.current[nextIndex]?.focus();
        }
    }, [views.length]);

    // Build class names
    const contentClassNames = [
        'merge-conflict-picker',
        className
    ].filter(Boolean).join(' ');

    // Check if merge is allowed
    const canMerge = selectedViewId !== null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Choose View for Merged Cell"
            icon="merge"
            severity="info"
            size="md"
            testId={testId}
            footer={
                <div className="merge-conflict-picker__footer">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleMerge}
                        disabled={!canMerge}
                        icon="merge"
                    >
                        Merge
                    </Button>
                </div>
            }
        >
            <div className={contentClassNames}>
                {/* Description */}
                <p className="merge-conflict-picker__description">
                    <span className="merge-conflict-picker__count">{views.length} cells</span> are being merged.
                    Select which view to keep in the expanded area.
                </p>

                {/* View cards grid */}
                <div
                    className="merge-conflict-picker__views"
                    role="radiogroup"
                    aria-label="Select view to keep"
                >
                    {views.map((view, index) => (
                        <ViewCard
                            key={view.id}
                            ref={el => viewCardsRef.current[index] = el}
                            view={view}
                            isSelected={selectedViewId === view.id}
                            onClick={() => handleViewSelect(view.id)}
                            onKeyDown={(e) => handleViewKeyDown(e, index)}
                        />
                    ))}
                </div>

                {/* Displaced views section */}
                <div className="merge-conflict-picker__displaced">
                    <h3 className="merge-conflict-picker__displaced__title">
                        What happens to displaced views?
                    </h3>

                    <div
                        className="displaced-options"
                        role="radiogroup"
                        aria-label="Displaced views action"
                    >
                        {DISPLACED_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isSelected = displacedAction === option.value;

                            return (
                                <div
                                    key={option.value}
                                    className={`displaced-option ${isSelected ? 'displaced-option--selected' : ''}`}
                                    onClick={() => handleDisplacedActionChange(option.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleDisplacedActionChange(option.value);
                                        }
                                    }}
                                    role="radio"
                                    aria-checked={isSelected}
                                    tabIndex={0}
                                >
                                    <span className="displaced-option__radio" aria-hidden="true" />
                                    <span className="displaced-option__icon" aria-hidden="true">
                                        <Icon size={16} />
                                    </span>
                                    <span className="displaced-option__content">
                                        <span className="displaced-option__label">{option.label}</span>
                                        <span className="displaced-option__description">{option.description}</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Remember choice checkbox */}
                <div className="merge-conflict-picker__remember">
                    <span
                        className={`merge-conflict-picker__remember__checkbox ${rememberChoice ? 'merge-conflict-picker__remember__checkbox--checked' : ''}`}
                        onClick={handleRememberToggle}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleRememberToggle();
                            }
                        }}
                        role="checkbox"
                        aria-checked={rememberChoice}
                        tabIndex={0}
                        aria-label="Remember my choice for this session"
                    >
                        {rememberChoice && <Icon name="check" size={12} />}
                    </span>
                    <span
                        className="merge-conflict-picker__remember__label"
                        onClick={handleRememberToggle}
                    >
                        Remember my choice for this session
                    </span>
                </div>
            </div>
        </Modal>
    );
}

export default memo(MergeConflictPicker);
export { MergeConflictPicker, DISPLACED_OPTIONS };