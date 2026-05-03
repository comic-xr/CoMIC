/**
 * DatasetContextHeader Component
 *
 * Appears when a view is selected, showing dataset info and quick actions.
 * Actions: Close All, Spawn, Go to Dataset
 */

import { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './DatasetContextHeader.scss';

export const DatasetContextHeader = memo(function DatasetContextHeader({
    dataset,
    viewCount = 0,
    onCloseAll,
    onSpawn,
    onGoToDataset,
}) {
    if (!dataset) return null;

    return (
        <div
            className="dataset-context-header"
            style={{ '--dataset-color': dataset.color || '#7dd3fc' }}
        >
            <div className="dataset-context-header__info">
                <Icon name="database" size={14} className="dataset-context-header__icon" />
                <span className="dataset-context-header__name">{dataset.name}</span>
                <span className="dataset-context-header__count">
                    {viewCount} view{viewCount !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="dataset-context-header__actions">
                <button
                    className="dataset-context-header__action dataset-context-header__action--danger"
                    onClick={onCloseAll}
                    title="Close all views from this dataset"
                >
                    <Icon name="close" size={12} />
                    <span>Close All</span>
                </button>

                <button
                    className="dataset-context-header__action"
                    onClick={onSpawn}
                    title="Spawn new view"
                >
                    <Icon name="add" size={12} />
                    <span>Spawn</span>
                </button>

                <button
                    className="dataset-context-header__action dataset-context-header__action--primary"
                    onClick={onGoToDataset}
                    title="Go to dataset"
                >
                    <Icon name="arrowRight" size={12} />
                    <span>Go to Dataset</span>
                </button>
            </div>
        </div>
    );
});

export default DatasetContextHeader;