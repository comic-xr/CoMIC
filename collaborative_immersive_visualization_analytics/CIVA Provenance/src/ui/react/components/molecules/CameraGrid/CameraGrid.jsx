/**
 * CameraGrid Component
 *
 * Grid of camera thumbnails for layout selection, adapts for VR/desktop.
 */
import React from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import './CameraGrid.scss';

export const CameraGrid = ({
    cameras = [],
    selectedIds = [],
    onSelect,
    onDoubleClick,
    columns = 3,
    showLabels = true,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useAdaptive();

    // Scale thumbnail size based on mode
    const thumbnailSize = mode === 'vr' ? 120 : 80;

    const gridStyle = {
        '--thumbnail-size': `${thumbnailSize}px`,
        '--gap': `${tokens.gap}px`,
        '--font-size': `${tokens.fontSize}px`,
        '--columns': columns,
    };

    const isSelected = (cameraId) => selectedIds.includes(cameraId);

    const handleClick = (camera, e) => {
        if (onSelect) {
            const multiSelect = e.ctrlKey || e.metaKey;
            onSelect(camera, multiSelect);
        }
    };

    const handleDoubleClick = (camera) => {
        onDoubleClick?.(camera);
    };

    return (
        <div
            className={`camera-grid camera-grid--${mode} ${className}`.trim()}
            style={gridStyle}
            role="grid"
            {...props}
        >
            {cameras.map((camera) => {
                const selected = isSelected(camera.id);
                return (
                    <button
                        key={camera.id}
                        type="button"
                        role="gridcell"
                        aria-selected={selected}
                        className={`camera-grid__item ${selected ? 'camera-grid__item--selected' : ''} ${camera.active ? 'camera-grid__item--active' : ''}`.trim()}
                        onClick={(e) => handleClick(camera, e)}
                        onDoubleClick={() => handleDoubleClick(camera)}
                    >
                        <div className="camera-grid__thumbnail">
                            {camera.thumbnail ? (
                                <img src={camera.thumbnail} alt={camera.name} />
                            ) : (
                                <Icon name="camera" size={tokens.iconSizeLg} />
                            )}
                            {camera.recording && (
                                <span className="camera-grid__recording">
                                    <Icon name="record" size={12} />
                                </span>
                            )}
                            {selected && (
                                <span className="camera-grid__check">
                                    <Icon name="check" size={16} />
                                </span>
                            )}
                        </div>
                        {showLabels && (
                            <span className="camera-grid__label">{camera.name}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default CameraGrid;
