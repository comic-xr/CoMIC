/**
 * DismissibleCard Component
 *
 * Adaptive dismissible card for notifications and temporary messages.
 * VR-first, desktop-friendly - automatically scales for VR with larger
 * touch targets and refined icon weights.
 */
import React from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import './DismissibleCard.scss';

export const DismissibleCard = ({
    icon,
    title,
    color,
    onDismiss,
    children,
    className = '',
}) => {
    const { mode, tokens, isVR } = useAdaptive();

    // Derive padding from gap
    const padding = Math.round(tokens.gap * 1.5);

    const style = {
        '--padding': `${padding}px`,
        '--gap': `${tokens.gap}px`,
        '--font-size': `${isVR ? 14 : 11}px`,
        '--dismiss-size': `${isVR ? 44 : 24}px`,
    };

    return (
        <div
            className={`
        dismissible-card
        dismissible-card--${mode}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
            data-color={color}
            style={style}
        >
            <div className="dismissible-card__header">
                {icon && (
                    <Icon
                        name={icon}
                        size={isVR ? 20 : 14}
                        className="dismissible-card__icon"
                    />
                )}
                <span className="dismissible-card__title">{title}</span>
                <button
                    type="button"
                    className="dismissible-card__dismiss"
                    onClick={onDismiss}
                    aria-label="Dismiss"
                >
                    <Icon name="close" size={isVR ? 16 : 12} />
                </button>
            </div>
            <div className="dismissible-card__content">
                {children}
            </div>
        </div>
    );
};

export default DismissibleCard;
