/**
 * @file TemplatesTabContent.jsx
 * @description Templates tab content for Layout Tab V4.6.
 *
 * Features:
 * - Saved templates grid with preview
 * - Personal vs Workspace template sections
 * - Save current as template action
 * - Drag templates to apply
 * - Template type badges (Full Workspace, Structure Only)
 *
 * VR-friendly:
 * - Large tap targets (48px+ for cards)
 * - Clear visual feedback
 * - 12px minimum text
 *
 * @example
 * <TemplatesTabContent
 *   templates={savedTemplates}
 *   customLayouts={customLayouts}
 *   onLoadTemplate={handleLoadTemplate}
 *   onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
 *   onDeleteTemplate={handleDeleteTemplate}
 * />
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LayoutPreview } from './LayoutPreview';
import { BUILTIN_LAYOUTS, getLayoutById } from '../constants/layouts.js';

/**
 * Template card component
 */
const TemplateCard = memo(function TemplateCard({
    template,
    customLayouts,
    onLoad,
    onDelete,
    onDragStart,
}) {
    const [showActions, setShowActions] = useState(false);

    // Get preview layouts for the template
    const previewLayouts = (template.preview || []).slice(0, 3).map(
        layoutId => getLayoutById(layoutId, customLayouts) || BUILTIN_LAYOUTS[0]
    );

    const typeLabel = template.type === 'full' ? 'Full Workspace' : 'Structure Only';
    const scopeIcon = template.scope === 'workspace' ? 'users' : 'user';

    return (
        <div
            className={`templates-tab__card ${showActions ? 'templates-tab__card--active' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('template', JSON.stringify(template));
                onDragStart?.(template);
            }}
        >
            {/* Preview area */}
            <div className="templates-tab__card-preview">
                {previewLayouts.length > 0 ? (
                    <div className="templates-tab__card-layouts">
                        {previewLayouts.map((layout, i) => (
                            <LayoutPreview
                                key={i}
                                layout={layout}
                                size="xs"
                                color="var(--color-accent-amber)"
                            />
                        ))}
                    </div>
                ) : (
                    <Icon name="sparkles" size={24} className="templates-tab__card-icon" />
                )}
            </div>

            {/* Info */}
            <div className="templates-tab__card-info">
                <span className="templates-tab__card-name">{template.name}</span>
                <div className="templates-tab__card-meta">
                    <span className={`templates-tab__card-type templates-tab__card-type--${template.type}`}>
                        {typeLabel}
                    </span>
                    <Icon name={scopeIcon} size={12} />
                </div>
            </div>

            {/* Actions overlay */}
            {showActions && (
                <div className="templates-tab__card-actions">
                    <button
                        className="templates-tab__card-btn templates-tab__card-btn--primary"
                        onClick={() => onLoad(template)}
                        title="Apply template"
                    >
                        <Icon name="play" size={14} />
                        <span>Apply</span>
                    </button>
                    <button
                        className="templates-tab__card-btn"
                        onClick={() => onDelete(template)}
                        title="Delete template"
                    >
                        <Icon name="trash" size={14} />
                    </button>
                </div>
            )}
        </div>
    );
});

/**
 * TemplatesTabContent component
 *
 * @param {Object} props - Component props
 * @param {Array} props.templates - Array of saved templates
 * @param {Array} props.customLayouts - Custom layout configurations
 * @param {Function} props.onLoadTemplate - Load template handler
 * @param {Function} props.onSaveCurrentAsTemplate - Save current as template handler
 * @param {Function} [props.onDeleteTemplate] - Delete template handler
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement}
 */
export const TemplatesTabContent = memo(function TemplatesTabContent({
    templates = [],
    customLayouts = [],
    onLoadTemplate,
    onSaveCurrentAsTemplate,
    onDeleteTemplate,
    className = '',
}) {
    const [draggedTemplate, setDraggedTemplate] = useState(null);

    // Separate templates by scope
    const personalTemplates = templates.filter(t => t.scope === 'personal');
    const workspaceTemplates = templates.filter(t => t.scope === 'workspace');

    const handleDragStart = useCallback((template) => {
        setDraggedTemplate(template);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggedTemplate(null);
    }, []);

    return (
        <div className={`templates-tab ${className}`} onDragEnd={handleDragEnd}>
            {/* Save current action */}
            <div className="templates-tab__save-action">
                <button
                    className="templates-tab__save-btn"
                    onClick={onSaveCurrentAsTemplate}
                >
                    <Icon name="save" size={16} />
                    <span>Save Current Layout as Template</span>
                </button>
            </div>

            {/* Personal templates */}
            {personalTemplates.length > 0 && (
                <div className="templates-tab__section">
                    <div className="templates-tab__section-header">
                        <Icon name="user" size={14} />
                        <span>Personal Templates</span>
                        <span className="templates-tab__section-count">
                            {personalTemplates.length}
                        </span>
                    </div>
                    <div className="templates-tab__grid">
                        {personalTemplates.map(template => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                customLayouts={customLayouts}
                                onLoad={onLoadTemplate}
                                onDelete={onDeleteTemplate}
                                onDragStart={handleDragStart}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Workspace templates */}
            {workspaceTemplates.length > 0 && (
                <div className="templates-tab__section">
                    <div className="templates-tab__section-header">
                        <Icon name="users" size={14} />
                        <span>Workspace Templates</span>
                        <span className="templates-tab__section-count">
                            {workspaceTemplates.length}
                        </span>
                    </div>
                    <div className="templates-tab__grid">
                        {workspaceTemplates.map(template => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                customLayouts={customLayouts}
                                onLoad={onLoadTemplate}
                                onDelete={onDeleteTemplate}
                                onDragStart={handleDragStart}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {templates.length === 0 && (
                <div className="templates-tab__empty">
                    <Icon name="sparkles" size={32} />
                    <span className="templates-tab__empty-title">No Templates Yet</span>
                    <span className="templates-tab__empty-hint">
                        Save your current layout as a template to quickly restore it later
                    </span>
                </div>
            )}

            {/* Drag hint */}
            {templates.length > 0 && (
                <div className="templates-tab__hint">
                    <Icon name="move" size={12} />
                    <span>Drag a template to the canvas to apply</span>
                </div>
            )}
        </div>
    );
});

export default TemplatesTabContent;
