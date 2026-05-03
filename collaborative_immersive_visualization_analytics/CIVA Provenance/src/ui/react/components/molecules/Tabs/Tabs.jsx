/**
 * Tabs Component
 *
 * Tab navigation that adapts for VR/desktop modes.
 */
import React from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import './Tabs.scss';

export const Tabs = ({
    tabs = [],
    activeTab,
    onChange,
    variant = 'default',
    fullWidth = false,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useAdaptive();

    // Derive padding from gap (similar to original adaptive tokens ratio)
    const padding = Math.round(tokens.gap * 1.5);

    const tabsStyle = {
        '--tab-height': `${tokens.buttonHeight}px`,
        '--padding': `${padding}px`,
        '--gap': `${tokens.gap}px`,
        '--font-size': `${tokens.fontSize}px`,
    };

    return (
        <div
            className={`tabs tabs--${mode} tabs--${variant} ${fullWidth ? 'tabs--full-width' : ''} ${className}`.trim()}
            style={tabsStyle}
            role="tablist"
            {...props}
        >
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    disabled={tab.disabled}
                    className={`tabs__tab ${activeTab === tab.id ? 'tabs__tab--active' : ''}`.trim()}
                    onClick={() => onChange?.(tab.id)}
                >
                    {tab.icon && <Icon name={tab.icon} size={tokens.iconSize} />}
                    {tab.label && <span className="tabs__label">{tab.label}</span>}
                    {tab.count !== undefined && (
                        <span className="tabs__count">{tab.count}</span>
                    )}
                </button>
            ))}
        </div>
    );
};

export default Tabs;
