// src/ui/react/components/common/ResizableSections/ResizableSections.jsx
// Resizable and collapsible sections
//
// Features:
// - Sections can be expanded/collapsed by clicking header
// - When multiple sections are open, they can be resized by dragging dividers
// - Sections fill available vertical space proportionally
// - Collapsed sections anchor appropriately (top→top, bottom→bottom, middle→below)
// - Touch support for VR/mobile
// - Adaptive sizing based on mode (VR vs desktop)

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import './ResizableSections.scss';

// =============================================================================
// SECTION HEADER
// =============================================================================

function SectionHeader({
    icon,           // Now a string like "folder", not a component
    iconColorClass,
    label,
    count,
    badge,
    color,
    isExpanded,
    onToggle,
    headerActions,
    isVR,
}) {
    const chevronSize = isVR ? 14 : 10;
    const iconSize = isVR ? 16 : 11;

    return (
        <div
            className="resizable-section__header"
            data-color={color}
            data-expanded={isExpanded}
            onClick={onToggle}
        >
            <span className="resizable-section__chevron">
                <Icon name={isExpanded ? "chevronDown" : "chevronRight"} size={chevronSize} />
            </span>
            {icon && <Icon name={icon} size={iconSize} className={`resizable-section__icon ${iconColorClass || ''}`} />}
            <span className="resizable-section__label">{label}</span>
            {badge > 0 && (
                <span className="resizable-section__badge">{badge}</span>
            )}
            {count !== undefined && <span className="resizable-section__count">{count}</span>}
            {headerActions && (
                <div className="resizable-section__header-actions" onClick={e => e.stopPropagation()}>
                    {headerActions}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// RESIZE DIVIDER
// =============================================================================

function ResizeDivider({ onDragStart, isActive, isVR }) {
    return (
        <div
            className={`resizable-section__divider ${isActive ? 'resizable-section__divider--active' : ''}`}
            onMouseDown={onDragStart}
            onTouchStart={onDragStart}
            style={{ height: isVR ? '12px' : '6px' }}
        >
            <div className="resizable-section__divider-handle" />
        </div>
    );
}

// =============================================================================
// SINGLE SECTION
// =============================================================================

export function ResizableSection({
    id,
    icon,           // String icon name like "folder"
    iconColorClass,
    label,
    count,
    badge = 0,
    color = 'default',
    isExpanded,
    onToggle,
    flexGrow = 1,
    minHeight = 32,
    children,
    showDivider = false,
    onDividerDrag,
    isDividerActive = false,
    headerActions,
}) {
    const { mode, isVR } = useAdaptive();
    const effectiveMinHeight = isVR ? Math.max(minHeight, 80) : minHeight;

    return (
        <div
            className={`resizable-section resizable-section--${mode} ${isExpanded ? 'resizable-section--expanded' : 'resizable-section--collapsed'}`}
            style={{
                flexGrow: isExpanded ? flexGrow : 0,
                flexShrink: isExpanded ? 1 : 0,
                flexBasis: isExpanded ? 0 : 'auto',
                minHeight: isExpanded ? effectiveMinHeight : 'auto',
            }}
            data-section-id={id}
            data-color={color}
        >
            <SectionHeader
                icon={icon}
                iconColorClass={iconColorClass}
                label={label}
                count={count}
                badge={badge}
                color={color}
                isExpanded={isExpanded}
                onToggle={onToggle}
                headerActions={headerActions}
                isVR={isVR}
            />

            {isExpanded && (
                <div className="resizable-section__content">
                    {children}
                </div>
            )}

            {showDivider && isExpanded && (
                <ResizeDivider
                    onDragStart={onDividerDrag}
                    isActive={isDividerActive}
                    isVR={isVR}
                />
            )}
        </div>
    );
}

// =============================================================================
// SECTIONS CONTAINER - Manages resize logic
// =============================================================================

export function ResizableSectionsContainer({
    children,
    className,
    sectionStates, // { [id]: { expanded: boolean, flexGrow: number } }
    onSectionToggle,
    onSectionResize,
}) {
    const { mode } = useAdaptive();
    const containerRef = useRef(null);
    const [resizing, setResizing] = useState(null); // { index, startY, startHeights }

    // Get array of section IDs that are expanded
    const expandedSections = Object.entries(sectionStates)
        .filter(([_, state]) => state.expanded)
        .map(([id]) => id);

    // Handle resize drag start (mouse or touch)
    const handleDragStart = useCallback((e, sectionIndex) => {
        e.preventDefault();

        if (!containerRef.current) return;

        // Support both mouse and touch events
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Get current heights of all expanded sections
        const sectionElements = containerRef.current.querySelectorAll('.resizable-section--expanded');
        const startHeights = Array.from(sectionElements).map(el => el.getBoundingClientRect().height);

        setResizing({
            index: sectionIndex,
            startY: clientY,
            startHeights,
        });
    }, []);

    // Handle mouse/touch move during resize
    useEffect(() => {
        if (!resizing) return;

        const handleMove = (e) => {
            // Support both mouse and touch events
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const deltaY = clientY - resizing.startY;
            const { index, startHeights } = resizing;

            // Calculate new heights
            const newHeights = [...startHeights];
            const minHeight = 60; // Minimum section height

            // Adjust the section being resized and the one below it
            newHeights[index] = Math.max(minHeight, startHeights[index] + deltaY);
            if (index + 1 < newHeights.length) {
                newHeights[index + 1] = Math.max(minHeight, startHeights[index + 1] - deltaY);
            }

            // Convert heights to flex-grow ratios
            const totalHeight = newHeights.reduce((a, b) => a + b, 0);
            const flexGrows = newHeights.map(h => h / totalHeight * expandedSections.length);

            // Update section states
            expandedSections.forEach((id, i) => {
                if (flexGrows[i] !== undefined) {
                    onSectionResize?.(id, flexGrows[i]);
                }
            });
        };

        const handleEnd = () => {
            setResizing(null);
        };

        // Add both mouse and touch event listeners
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('touchend', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [resizing, expandedSections, onSectionResize]);

    // Clone children with resize props
    const enhancedChildren = React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const sectionId = child.props.id;
        const state = sectionStates[sectionId] || { expanded: false, flexGrow: 1 };
        const isLastExpanded = expandedSections.indexOf(sectionId) === expandedSections.length - 1;
        const sectionIndex = expandedSections.indexOf(sectionId);

        // When only one section is expanded, it should fill all available space
        // regardless of any previously set flexGrow ratio
        const effectiveFlexGrow = expandedSections.length === 1 ? 1 : state.flexGrow;

        return React.cloneElement(child, {
            isExpanded: state.expanded,
            flexGrow: effectiveFlexGrow,
            onToggle: () => onSectionToggle?.(sectionId),
            showDivider: state.expanded && !isLastExpanded && expandedSections.length > 1,
            onDividerDrag: (e) => handleDragStart(e, sectionIndex),
            isDividerActive: resizing?.index === sectionIndex,
        });
    });

    const containerClasses = [
        'resizable-sections-container',
        `resizable-sections-container--${mode}`,
        resizing && 'resizable-sections-container--resizing',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div ref={containerRef} className={containerClasses}>
            {enhancedChildren}
        </div>
    );
}

// =============================================================================
// SIMPLE SECTIONS WRAPPER - For array-based section definitions
// =============================================================================

export function ResizableSections({ sections }) {
    // Initialize state from sections
    const initialStates = {};
    sections.forEach((section, index) => {
        initialStates[section.id] = {
            expanded: section.defaultExpanded !== false, // Default to expanded
            flexGrow: section.flexGrow || 1,
        };
    });

    const { states, toggleSection, resizeSection } = useSectionStates(initialStates);

    return (
        <ResizableSectionsContainer
            sectionStates={states}
            onSectionToggle={toggleSection}
            onSectionResize={resizeSection}
        >
            {sections.map(section => (
                <ResizableSection
                    key={section.id}
                    id={section.id}
                    label={section.title}
                    icon={section.icon}
                    iconColorClass={section.iconColorClass}
                    minHeight={section.minHeight || 60}
                    headerActions={section.headerActions}
                >
                    {section.content}
                </ResizableSection>
            ))}
        </ResizableSectionsContainer>
    );
}

// =============================================================================
// HOOK FOR MANAGING SECTION STATE
// =============================================================================

const SECTION_STATE_PREFIX = 'cia_section_state_';

/**
 * Load section states from localStorage
 * @param {string} storageKey - Storage key
 * @param {Object} initialStates - Default states
 * @returns {Object} Stored states or initial states
 */
function loadSectionStates(storageKey, initialStates) {
    if (!storageKey) return initialStates;
    try {
        const stored = localStorage.getItem(`${SECTION_STATE_PREFIX}${storageKey}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with initialStates to ensure new sections have defaults
            return { ...initialStates, ...parsed };
        }
    } catch (err) {
        console.warn('Failed to load section states:', err);
    }
    return initialStates;
}

/**
 * Save section states to localStorage
 * @param {string} storageKey - Storage key
 * @param {Object} states - States to save
 */
function saveSectionStates(storageKey, states) {
    if (!storageKey) return;
    try {
        localStorage.setItem(`${SECTION_STATE_PREFIX}${storageKey}`, JSON.stringify(states));
    } catch (err) {
        console.warn('Failed to save section states:', err);
    }
}

/**
 * Hook for managing section expand/collapse and flex-grow states
 * @param {Object} initialStates - Default states for each section
 * @param {Object} options - Options
 * @param {string} [options.storageKey] - If provided, states persist to localStorage
 * @returns {Object} State management functions
 */
export function useSectionStates(initialStates, options = {}) {
    const { storageKey } = options;

    const [states, setStates] = useState(() =>
        loadSectionStates(storageKey, initialStates)
    );

    // Save to localStorage when states change
    useEffect(() => {
        saveSectionStates(storageKey, states);
    }, [storageKey, states]);

    const toggleSection = useCallback((id) => {
        setStates(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                expanded: !prev[id]?.expanded,
            }
        }));
    }, []);

    const resizeSection = useCallback((id, flexGrow) => {
        setStates(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                flexGrow,
            }
        }));
    }, []);

    const setExpanded = useCallback((id, expanded) => {
        setStates(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                expanded,
            }
        }));
    }, []);

    return {
        states,
        toggleSection,
        resizeSection,
        setExpanded,
        setStates,
    };
}

export default ResizableSections;