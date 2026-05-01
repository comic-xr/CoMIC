// src/ui/react/components/molecules/NavDotBar/NavDotBar.jsx
// NavDotBar molecule - Row of navigation dots for section navigation

import React, { memo } from 'react';
import { NavDot } from '@UI/react/components/atoms';
import { useAdaptive } from '@UI/react/context';
import './NavDotBar.scss';

/**
 * @typedef {Object} SectionConfig
 * @property {string} id - Unique section identifier
 * @property {string} icon - Icon name to display
 * @property {string} label - Section label
 * @property {string} color - CSS color for the dot
 */

/**
 * NavDotBar - Row of navigation dots for section navigation
 *
 * Composed from: NavDot atom[]
 *
 * Use for:
 * - Section navigation in panels
 * - Progress indicators
 * - Quick-jump navigation
 *
 * @param {SectionConfig[]} sections - Array of section configurations
 * @param {string} currentSectionId - ID of the currently active section
 * @param {function} onSectionClick - Callback when a dot is clicked: (sectionId, event) => void
 * @param {string} size - Size: 'sm' | 'md' | 'lg'
 * @param {string} className - Additional CSS classes
 */
export const NavDotBar = memo(function NavDotBar({
    sections = [],
    currentSectionId,
    onSectionClick,
    size = 'md',
    className = '',
}) {
    const { isVR } = useAdaptive();

    const classList = [
        'nav-dot-bar',
        isVR && 'nav-dot-bar--vr',
        className,
    ].filter(Boolean).join(' ');

    const handleDotClick = (sectionId) => (event) => {
        onSectionClick?.(sectionId, event);
    };

    return (
        <div className={classList} role="navigation" aria-label="Section navigation">
            {sections.map((section) => (
                <NavDot
                    key={section.id}
                    icon={section.icon}
                    label={section.label}
                    color={section.color}
                    isActive={section.id === currentSectionId}
                    size={size}
                    onClick={handleDotClick(section.id)}
                />
            ))}
        </div>
    );
});

export default NavDotBar;
