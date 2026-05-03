/**
 * SectionHeader Component
 *
 * Simple collapsible list header for sections below the main header cards.
 * VR-first, desktop-friendly - automatically scales for VR with larger
 * touch targets and refined icon weights.
 */
import React, { useState } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import './SectionHeader.scss';

export const SectionHeader = ({
    icon,
    children,
    count,
    color,
    actions,
    defaultExpanded = true,
    onToggle,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const { mode, isVR } = useAdaptive();

    const handleToggle = () => {
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        onToggle?.(newExpanded);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            className={`section-header section-header--${mode}`}
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            aria-expanded={isExpanded}
        >
            <span
                className="section-header__chevron"
                data-expanded={isExpanded}
            >
                <Icon name="chevronDown" size={isVR ? 14 : 10} />
            </span>
            {icon && (
                <Icon
                    name={icon}
                    size={isVR ? 16 : 11}
                    className="section-header__icon"
                    style={{ color }}
                />
            )}
            <span className="section-header__label">{children}</span>
            {count !== undefined && (
                <span className="section-header__count">{count}</span>
            )}
            {actions && (
                <div
                    className="section-header__actions"
                    onClick={e => e.stopPropagation()}
                >
                    {actions}
                </div>
            )}
        </div>
    );
};

export default SectionHeader;
