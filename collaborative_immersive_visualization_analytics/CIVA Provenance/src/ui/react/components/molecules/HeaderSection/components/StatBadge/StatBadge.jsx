/**
 * StatBadge Component
 *
 * Adaptive icon + text badge for statistics display.
 */
import React from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import './StatBadge.scss';

export const StatBadge = ({ icon, color, children }) => {
    const { mode, isVR } = useAdaptive();

    return (
        <span className={`stat-badge stat-badge--${mode}`} style={{ color }}>
            {icon && <Icon name={icon} size={isVR ? 16 : 12} />}
            {children}
        </span>
    );
};

export default StatBadge;
