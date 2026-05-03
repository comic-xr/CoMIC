/**
 * @file ModeToggle.jsx
 * @description Mode toggle (Tile vs Tabs) for the workspace bar.
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';

const ModeToggle = memo(function ModeToggle({
    canvasMode = 'tile',
    onModeChange,
}) {
    return (
        <div className="workspace-bar__mode-toggle">
            <button
                className={`workspace-bar__mode-btn ${canvasMode === 'tile' ? 'workspace-bar__mode-btn--active' : ''}`}
                onClick={() => onModeChange('tile')}
                title="Tile Mode"
            >
                <Icon name="grid" size={12} />
            </button>
            <button
                className={`workspace-bar__mode-btn ${canvasMode === 'tabs' ? 'workspace-bar__mode-btn--active' : ''}`}
                onClick={() => onModeChange('tabs')}
                title="Tab Mode"
            >
                <Icon name="layers" size={12} />
            </button>
        </div>
    );
});

ModeToggle.propTypes = {
    canvasMode: PropTypes.oneOf(['tile', 'tabs']),
    onModeChange: PropTypes.func.isRequired,
};

export { ModeToggle };
export default ModeToggle;
