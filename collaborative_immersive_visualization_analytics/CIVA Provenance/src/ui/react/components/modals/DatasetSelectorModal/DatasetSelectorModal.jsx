/**
 * @file DatasetSelectorModal.jsx
 * @description Modal for selecting a dataset to place in an empty canvas cell.
 *
 * Features:
 * - Lists all available datasets
 * - Search filtering
 * - Displays dataset metadata (point count, uploaded by, etc.)
 * - Creates view configuration and placement on selection
 */

import React, { useState, useMemo, useCallback } from 'react';
import Modal from '@UI/react/components/modals/Modal';
import { Icon } from '@UI/react/components/atoms';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { getViewConfigurationManager, getCanvasManager } from '@Init/appInitializer.js';
import { toast } from '@UI/react/store/toastStore';
import './DatasetSelectorModal.scss';

/**
 * DatasetSelectorModal component.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal should close
 * @param {number} props.targetRow - Target row for placement
 * @param {number} props.targetCol - Target column for placement
 */
export function DatasetSelectorModal({
    isOpen,
    onClose,
    targetRow,
    targetCol,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isPlacing, setIsPlacing] = useState(false);

    const datasets = useDatasets();

    // Filter datasets based on search
    const filteredDatasets = useMemo(() => {
        if (!searchQuery) return datasets;
        const q = searchQuery.toLowerCase();
        return datasets.filter(d =>
            d.name?.toLowerCase().includes(q) ||
            d.uploadedByName?.toLowerCase().includes(q)
        );
    }, [datasets, searchQuery]);

    // Handle dataset selection
    const handleSelect = useCallback(async (dataset) => {
        if (isPlacing) return;
        setIsPlacing(true);

        try {
            const viewManager = getViewConfigurationManager();
            const canvasManager = getCanvasManager();

            if (!viewManager || !canvasManager) {
                toast.error('Managers not available');
                return;
            }

            // Create a new view configuration for the dataset
            const view = await viewManager.createView(dataset.id, {
                name: dataset.name,
            });

            if (!view) {
                toast.error('Failed to create view');
                return;
            }

            // Create placement on the canvas
            canvasManager.createPlacement(
                view.id,
                targetRow,
                targetCol,
                1, // rowSpan
                1  // colSpan
            );

            toast.success(`Placed ${dataset.name} at row ${targetRow + 1}, col ${targetCol + 1}`);
            onClose();
        } catch (error) {
            console.error('Failed to place dataset:', error);
            toast.error('Failed to place dataset');
        } finally {
            setIsPlacing(false);
        }
    }, [isPlacing, targetRow, targetCol, onClose]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Select Dataset"
            icon="database"
            size="md"
            testId="dataset-selector-modal"
        >
            <div className="dataset-selector-modal">
                <p className="dataset-selector-modal__hint">
                    Select a dataset to place at row {targetRow + 1}, column {targetCol + 1}
                </p>

                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search datasets..."
                    className="dataset-selector-modal__search"
                />

                <div className="dataset-selector-modal__list">
                    {filteredDatasets.length === 0 ? (
                        <div className="dataset-selector-modal__empty">
                            <Icon name="inbox" size={24} />
                            <p>{datasets.length === 0 ? 'No datasets available' : 'No matching datasets'}</p>
                            {datasets.length === 0 && (
                                <p className="dataset-selector-modal__empty-hint">
                                    Upload a dataset to get started
                                </p>
                            )}
                        </div>
                    ) : (
                        filteredDatasets.map(dataset => (
                            <button
                                key={dataset.id}
                                className="dataset-selector-modal__item"
                                onClick={() => handleSelect(dataset)}
                                disabled={isPlacing}
                            >
                                <Icon name="hexagon" size={16} className="dataset-selector-modal__item-icon" />
                                <div className="dataset-selector-modal__item-info">
                                    <span className="dataset-selector-modal__item-name">{dataset.name}</span>
                                    <span className="dataset-selector-modal__item-meta">
                                        {dataset.pointCount > 0 && `${dataset.pointCount.toLocaleString()} points`}
                                        {dataset.uploadedByName && ` • ${dataset.uploadedByName}`}
                                    </span>
                                </div>
                                <Icon name="chevronRight" size={14} className="dataset-selector-modal__item-arrow" />
                            </button>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
}

export default DatasetSelectorModal;
