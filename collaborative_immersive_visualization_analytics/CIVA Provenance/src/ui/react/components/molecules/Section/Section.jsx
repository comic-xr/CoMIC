/**
 * Section Component
 *
 * Collapsible section with header, adapts for VR/desktop modes.
 */
import React, { useState } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import './Section.scss';

export const Section = ({
    title,
    icon,
    defaultExpanded = true,
    collapsible = true,
    children,
    actions,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useAdaptive();
    const [expanded, setExpanded] = useState(defaultExpanded);

    // Derive padding from gap (similar to original adaptive tokens ratio)
    const padding = Math.round(tokens.gap * 1.5);

    const sectionStyle = {
        '--header-height': `${tokens.buttonHeight}px`,
        '--padding': `${padding}px`,
        '--gap': `${tokens.gap}px`,
        '--font-size': `${tokens.fontSize}px`,
    };

    const handleToggle = () => {
        if (collapsible) {
            setExpanded(!expanded);
        }
    };

    return (
        <div
            className={`section section--${mode} ${expanded ? 'section--expanded' : ''} ${className}`.trim()}
            style={sectionStyle}
            {...props}
        >
            <button
                type="button"
                className="section__header"
                onClick={handleToggle}
                disabled={!collapsible}
                aria-expanded={expanded}
            >
                <div className="section__title-group">
                    {icon && <Icon name={icon} size={tokens.iconSize} />}
                    <span className="section__title">{title}</span>
                </div>
                <div className="section__actions">
                    {actions}
                    {collapsible && (
                        <Icon
                            name={expanded ? 'chevronUp' : 'chevronDown'}
                            size={tokens.iconSize}
                            className="section__chevron"
                        />
                    )}
                </div>
            </button>
            {expanded && (
                <div className="section__content">
                    {children}
                </div>
            )}
        </div>
    );
};

export default Section;
