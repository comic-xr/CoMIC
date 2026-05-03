/**
 * PropertyPanel Organism
 *
 * A comprehensive property editing panel that combines multiple molecules.
 * Used for inspecting and editing properties of selected items.
 *
 * Composes:
 * - PanelHeader molecule
 * - Section molecule
 * - InfoRow molecule
 * - Toggle atom
 * - Slider atom
 * - Chip atom
 */

import React, { memo, useState, useCallback } from 'react';
import { useAdaptive } from '@UI/react/context';
import { PanelHeader } from '@UI/react/components/molecules/PanelHeader';
import { Section } from '@UI/react/components/molecules/Section';
import { InfoRow } from '@UI/react/components/molecules/InfoRow';
import { Toggle } from '@UI/react/components/atoms/Toggle';
import { Slider } from '@UI/react/components/atoms/Slider';
import { Chip } from '@UI/react/components/atoms/Chip';
import { IconButton } from '@UI/react/components/atoms/Button';
import './PropertyPanel.scss';

/**
 * PropertyPanel - Property inspector/editor panel
 *
 * @param {string} title - Panel title
 * @param {string} icon - Panel header icon
 * @param {object} target - Target object being edited
 * @param {Array} sections - Array of section configurations
 * @param {function} onChange - Called when any property changes
 * @param {function} onClose - Called when panel is closed
 * @param {boolean} collapsible - Whether sections are collapsible
 * @param {string} className - Additional CSS classes
 */
export const PropertyPanel = memo(function PropertyPanel({
    title = 'Properties',
    icon = 'sliders',
    target,
    sections = [],
    onChange,
    onClose,
    collapsible = true,
    className = '',
}) {
    const { isVR } = useAdaptive();
    const [expandedSections, setExpandedSections] = useState(() =>
        new Set(sections.filter(s => s.defaultExpanded !== false).map(s => s.id))
    );

    const toggleSection = useCallback((sectionId) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    }, []);

    const handleChange = useCallback((propertyPath, value) => {
        onChange?.(propertyPath, value, target);
    }, [onChange, target]);

    const classList = [
        'property-panel',
        isVR && 'property-panel--vr',
        className,
    ].filter(Boolean).join(' ');

    const renderPropertyControl = (property) => {
        const { id, type, label, value, options, ...rest } = property;

        switch (type) {
            case 'toggle':
                return (
                    <div className="property-panel__row" key={id}>
                        <span className="property-panel__label">{label}</span>
                        <Toggle
                            checked={value}
                            onChange={(newValue) => handleChange(id, newValue)}
                            size="sm"
                            {...rest}
                        />
                    </div>
                );

            case 'slider':
                return (
                    <div className="property-panel__row property-panel__row--vertical" key={id}>
                        <span className="property-panel__label">{label}</span>
                        <Slider
                            value={value}
                            onChange={(newValue) => handleChange(id, newValue)}
                            {...rest}
                        />
                    </div>
                );

            case 'chips':
                return (
                    <div className="property-panel__row property-panel__row--vertical" key={id}>
                        <span className="property-panel__label">{label}</span>
                        <div className="property-panel__chips">
                            {options?.map(option => (
                                <Chip
                                    key={option.value}
                                    label={option.label}
                                    icon={option.icon}
                                    selected={value === option.value}
                                    onClick={() => handleChange(id, option.value)}
                                    size="sm"
                                />
                            ))}
                        </div>
                    </div>
                );

            case 'info':
                return (
                    <InfoRow
                        key={id}
                        label={label}
                        value={value}
                        icon={rest.icon}
                        size="sm"
                    />
                );

            case 'color':
                return (
                    <div className="property-panel__row" key={id}>
                        <span className="property-panel__label">{label}</span>
                        <div className="property-panel__color-swatch">
                            <input
                                type="color"
                                value={value}
                                onChange={(e) => handleChange(id, e.target.value)}
                                className="property-panel__color-input"
                            />
                            <span className="property-panel__color-value">{value}</span>
                        </div>
                    </div>
                );

            case 'buttons':
                return (
                    <div className="property-panel__row" key={id}>
                        <span className="property-panel__label">{label}</span>
                        <div className="property-panel__buttons">
                            {options?.map(option => (
                                <IconButton
                                    key={option.value}
                                    icon={option.icon}
                                    tooltip={option.label}
                                    variant={value === option.value ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => handleChange(id, option.value)}
                                />
                            ))}
                        </div>
                    </div>
                );

            default:
                return (
                    <InfoRow
                        key={id}
                        label={label}
                        value={String(value)}
                        size="sm"
                    />
                );
        }
    };

    return (
        <div className={classList}>
            <PanelHeader
                title={title}
                icon={icon}
                onClose={onClose}
            />

            <div className="property-panel__content">
                {sections.map(section => (
                    <Section
                        key={section.id}
                        title={section.title}
                        icon={section.icon}
                        collapsible={collapsible}
                        expanded={expandedSections.has(section.id)}
                        onToggle={() => toggleSection(section.id)}
                    >
                        {section.properties?.map(renderPropertyControl)}
                    </Section>
                ))}

                {sections.length === 0 && (
                    <div className="property-panel__empty">
                        Select an item to view its properties
                    </div>
                )}
            </div>
        </div>
    );
});

export default PropertyPanel;
