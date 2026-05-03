// ToolsSubtab.jsx
// Enhanced Tools list subtab for InstanceToolsTab with categorized sections
//
// Per spec: Tools organized into Navigation, Representation, Widgets, Appearance

import React, { useState, useMemo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { SectionNavGroup } from '@UI/react/components/organisms';
import { ToolOptionItem } from '@UI/react/components/molecules/InstanceToolOptions/InstanceToolOptions';

// =============================================================================
// HELPERS
// =============================================================================

const DEFAULT_SECTION = {
    id: 'tools',
    label: 'Tools',
    icon: 'wrench',
    color: 'var(--color-text-secondary)',
};

// =============================================================================
// TOOL MENU COMPONENT (Expandable menu within a category)
// =============================================================================

function ToolMenu({ tool, expanded, onToggle }) {
    const isDisabled = tool.disabled || false;
    const hasActiveOption = tool.options?.some(opt => opt.active);

    return (
        <div className={`tool-menu ${expanded ? 'tool-menu--expanded' : ''} ${isDisabled ? 'tool-menu--disabled' : ''}`}>
            <button
                className={`tool-menu__header ${hasActiveOption ? 'tool-menu__header--has-active' : ''}`}
                onClick={() => !isDisabled && onToggle?.()}
                disabled={isDisabled}
            >
                <Icon name={tool.icon || 'circle'} size={14} />
                <div className="tool-menu__header-content">
                    <span className="tool-menu__title">{tool.label}</span>
                    {tool.description && !expanded && (
                        <span className="tool-menu__hint">{tool.description}</span>
                    )}
                </div>
                <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={12} />
            </button>
            {expanded && tool.options && (
                <div className="tool-menu__options">
                    {tool.options.map((option, index) => (
                        <ToolOptionItem
                            key={option.id || index}
                            option={option}
                            onClose={() => {}}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// TOOL BUTTON COMPONENT (Single action tool)
// =============================================================================

function ToolButton({ tool, onClick }) {
    const isActive = tool.active || false;
    const isDisabled = tool.disabled || false;

    return (
        <button
            className={`tool-button ${isActive ? 'tool-button--active' : ''} ${isDisabled ? 'tool-button--disabled' : ''}`}
            onClick={() => !isDisabled && onClick?.(tool)}
            title={tool.description || tool.label}
            disabled={isDisabled}
        >
            <Icon name={tool.icon || 'circle'} size={16} />
            <span>{tool.label}</span>
        </button>
    );
}

// =============================================================================
// TOOL CATEGORY CONTENT COMPONENT
// =============================================================================

function ToolCategoryContent({ tools, expandedMenus, onToggleMenu }) {
    if (!tools || tools.length === 0) return null;

    return (
        <div className="tool-category__list">
            {tools.map((tool, index) => {
                if (tool.type === 'menu') {
                    return (
                        <ToolMenu
                            key={tool.id}
                            tool={tool}
                            expanded={expandedMenus[tool.id]}
                            onToggle={() => onToggleMenu(tool.id)}
                        />
                    );
                }

                return (
                    <ToolButton
                        key={tool.id || index}
                        tool={tool}
                        onClick={() => tool.onClick?.()}
                    />
                );
            })}
        </div>
    );
}

// =============================================================================
// MAIN TOOLS LIST COMPONENT
// =============================================================================

export function ToolsList({ tools, toolSections = [], expandedMenus, onToggleMenu }) {
    const groupedTools = useMemo(() => {
        const grouped = new Map();
        (tools || []).forEach((tool) => {
            if (tool?.type === 'separator') return;
            const sectionId = tool.section || 'other';
            if (!grouped.has(sectionId)) {
                grouped.set(sectionId, []);
            }
            grouped.get(sectionId).push(tool);
        });
        return grouped;
    }, [tools]);

    const sections = useMemo(() => {
        const baseSections = toolSections && toolSections.length
            ? toolSections
            : [DEFAULT_SECTION];

        const resolved = [];

        baseSections.forEach((section) => {
            const sectionTools = groupedTools.get(section.id) || [];
            if (!sectionTools.length) return;

            resolved.push({
                id: section.id,
                icon: section.icon || DEFAULT_SECTION.icon,
                label: section.label || DEFAULT_SECTION.label,
                color: section.color || DEFAULT_SECTION.color,
                itemCount: sectionTools.length,
                content: (
                    <ToolCategoryContent
                        tools={sectionTools}
                        expandedMenus={expandedMenus}
                        onToggleMenu={onToggleMenu}
                    />
                ),
            });
        });

        groupedTools.forEach((sectionTools, sectionId) => {
            if (!sectionTools.length) return;
            if (baseSections.some((section) => section.id === sectionId)) return;

            resolved.push({
                id: sectionId,
                icon: DEFAULT_SECTION.icon,
                label: sectionId === 'other' ? 'Other' : sectionId,
                color: DEFAULT_SECTION.color,
                itemCount: sectionTools.length,
                content: (
                    <ToolCategoryContent
                        tools={sectionTools}
                        expandedMenus={expandedMenus}
                        onToggleMenu={onToggleMenu}
                    />
                ),
            });
        });

        return resolved;
    }, [groupedTools, toolSections, expandedMenus, onToggleMenu]);

    if (!tools || tools.length === 0) {
        return (
            <div className="tools-list__empty">
                <Icon name="wrench" size={24} />
                <span>No tools available</span>
                <p>Load data to see tools</p>
            </div>
        );
    }

    return (
        <div className="tools-list">
            <SectionNavGroup
                sections={sections}
                defaultSectionId={sections[0]?.id}
                size="sm"
            />
        </div>
    );
}

export default ToolsList;
