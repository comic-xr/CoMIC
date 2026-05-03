// src/ui/react/components/molecules/SectionNavHeader/SectionNavHeader.jsx
// SectionNavHeader molecule - Header with current section display and navigation dots

import React, { memo, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { NavDotBar } from '@UI/react/components/molecules/NavDotBar';
import { useAdaptive } from '@UI/react/context';
import './SectionNavHeader.scss';

/**
 * @typedef {Object} SectionConfig
 * @property {string} id - Unique section identifier
 * @property {string} icon - Icon name to display
 * @property {string} label - Section label
 * @property {string} color - CSS color for the dot
 */

/**
 * SectionNavHeader - Header with current section display and navigation dots
 *
 * Composed from: Icon atom + NavDotBar molecule
 *
 * Use for:
 * - Section group navigation headers
 * - Panel section navigation
 * - Shows current section with icon/label and dots for quick navigation
 *
 * @param {SectionConfig[]} sections - Array of section configurations
 * @param {string} currentSectionId - ID of the currently active section
 * @param {function} onSectionClick - Callback when a nav dot is clicked: (sectionId, event) => void
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {string} className - Additional CSS classes
 */
export const SectionNavHeader = memo(function SectionNavHeader({
    sections = [],
    currentSectionId,
    onSectionClick,
    size = 'md',
    className = '',
}) {
    const { isVR, tokens } = useAdaptive();

    // Get current section config
    const currentSection = useMemo(() => {
        return sections.find(s => s.id === currentSectionId) || sections[0];
    }, [sections, currentSectionId]);

    const classList = [
        'section-nav-header',
        isVR && 'section-nav-header--vr',
        className,
    ].filter(Boolean).join(' ');

    if (!currentSection) {
        return null;
    }

    return (
        <div className={classList}>
            {/* Current section indicator */}
            <div className="section-nav-header__current">
                <Icon
                    name={currentSection.icon}
                    size={tokens?.iconSize || 13}
                    style={{ color: currentSection.color }}
                    className="section-nav-header__icon"
                />
                <span className="section-nav-header__label">
                    {currentSection.label}
                </span>
            </div>

            {/* Navigation dots */}
            <NavDotBar
                sections={sections}
                currentSectionId={currentSectionId}
                onSectionClick={onSectionClick}
                size={size}
                className="section-nav-header__dots"
            />
        </div>
    );
});

export default SectionNavHeader;
