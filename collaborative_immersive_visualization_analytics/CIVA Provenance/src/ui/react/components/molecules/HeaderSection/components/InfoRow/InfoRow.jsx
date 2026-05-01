/**
 * InfoRow Component
 *
 * Adaptive label/value row with optional icon.
 */
import React from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import './InfoRow.scss';

export const InfoRow = ({ icon, label, value, color, subtle = false }) => {
    const { mode, isVR } = useAdaptive();

    return (
        <div className={`info-row info-row--${mode}`}>
            {icon && (
                <Icon
                    name={icon}
                    size={isVR ? 20 : 14}
                    className="info-row__icon"
                    style={{ color }}
                />
            )}
            {label && <span className="info-row__label">{label}</span>}
            <span className={`info-row__value ${subtle ? 'info-row__value--subtle' : ''}`}>
                {value}
            </span>
        </div>
    );
};

export default InfoRow;
