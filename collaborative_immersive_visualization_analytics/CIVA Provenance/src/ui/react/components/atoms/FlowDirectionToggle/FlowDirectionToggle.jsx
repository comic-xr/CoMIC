/**
 * @file FlowDirectionToggle.jsx
 * @description Toggle between row-first and column-first auto-placement.
 *
 * - Row (→): Fills (0,0), (0,1), (0,2)... then (1,0), (1,1)...
 * - Column (↓): Fills (0,0), (1,0), (2,0)... then (0,1), (1,1)...
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';

import './FlowDirectionToggle.scss';

/**
 * Toggle for canvas flow direction.
 *
 * @param {Object} props - Component props
 * @param {string} [props.direction] - Current direction ('row' or 'column')
 * @param {Function} [props.onChange] - Callback when direction changes
 */
export function FlowDirectionToggle({ direction = 'row', onChange }) {
    const handleChange = (newDirection) => {
        onChange?.(newDirection);
    };

    return (
        <div className="flow-direction-toggle" role="group" aria-label="Flow direction">
            <Tooltip content="Row-first placement (→)">
                <button
                    className={`flow-direction-toggle__btn ${direction === 'row' ? 'active' : ''
                        }`}
                    onClick={() => handleChange('row')}
                    aria-pressed={direction === 'row'}
                    type="button"
                >
                    <Icon name="arrowRight" size={16} />
                </button>
            </Tooltip>
            <Tooltip content="Column-first placement (↓)">
                <button
                    className={`flow-direction-toggle__btn ${direction === 'column' ? 'active' : ''
                        }`}
                    onClick={() => handleChange('column')}
                    aria-pressed={direction === 'column'}
                    type="button"
                >
                    <Icon name="arrowDown" size={16} />
                </button>
            </Tooltip>
        </div>
    );
}

export default FlowDirectionToggle;