// src/ui/react/components/organisms/SectionNavGroup/SectionNavGroup.jsx
// SectionNavGroup organism - Section group with dot navigation and scroll-based section detection

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms';
import { SectionNavHeader } from '@UI/react/components/molecules';
import './SectionNavGroup.scss';

/**
 * @typedef {Object} SectionConfig
 * @property {string} id - Unique section identifier
 * @property {string} icon - Icon name to display
 * @property {string} label - Section label
 * @property {string} color - CSS color for the section
 * @property {React.ReactNode} content - Section content
 * @property {number} [itemCount] - Optional item count to display
 */

/**
 * SectionHeader - Individual section header within the scrollable content
 */
function SectionHeader({ icon, label, color, itemCount, isVR }) {
    const iconSize = isVR ? 14 : 12;

    return (
        <div className="section-nav-group__section-header">
            <Icon
                name={icon}
                size={iconSize}
                style={{ color }}
                className="section-nav-group__section-icon"
            />
            <span className="section-nav-group__section-label">{label}</span>
            {itemCount !== undefined && (
                <span className="section-nav-group__section-count">{itemCount}</span>
            )}
        </div>
    );
}

/**
 * SectionNavGroup - Section group with dot navigation and scroll-based section detection
 *
 * Composed from: SectionNavHeader molecule + sections with IntersectionObserver
 *
 * Features:
 * - Dot navigation for quick jump to sections
 * - IntersectionObserver for detecting current section while scrolling
 * - Smooth scroll to section on dot click
 * - Non-collapsible sections (unlike ResizableSections)
 *
 * Use for:
 * - Tool panels with many categories
 * - Property panels with grouped sections
 * - Any scrollable content with multiple sections
 *
 * @param {SectionConfig[]} sections - Array of section configurations
 * @param {string} [defaultSectionId] - ID of the section to highlight initially
 * @param {string} [size='md'] - Size for the nav dots: 'sm' | 'md' | 'lg'
 * @param {string} [className] - Additional CSS classes
 */
export function SectionNavGroup({
    sections = [],
    defaultSectionId,
    size = 'md',
    className = '',
}) {
    const { isVR, mode } = useAdaptive();
    const scrollContainerRef = useRef(null);
    const sectionRefs = useRef({});

    // Current section state
    const [currentSectionId, setCurrentSectionId] = useState(
        defaultSectionId || sections[0]?.id
    );

    // Build section configs for the nav header
    const sectionConfigs = useMemo(() => {
        return sections.map(section => ({
            id: section.id,
            icon: section.icon,
            label: section.label,
            color: section.color,
        }));
    }, [sections]);

    // Scroll to section using container's scrollTop
    const scrollToSection = useCallback((id, event) => {
        // Remove focus from any focused element to prevent focus ring staying
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }

        const container = scrollContainerRef.current;
        const sectionEl = sectionRefs.current[id];

        if (container && sectionEl) {
            // Calculate the offset of the section relative to the scroll container
            const containerRect = container.getBoundingClientRect();
            const sectionRect = sectionEl.getBoundingClientRect();
            const currentScrollTop = container.scrollTop;

            // Target scroll position: current scroll + (section position - container position)
            const targetScrollTop = currentScrollTop + (sectionRect.top - containerRect.top);

            container.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth',
            });
        }
    }, []);

    // Use scroll event to detect which section is at the top
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || sections.length === 0) return;

        const handleScroll = () => {
            const containerTop = container.getBoundingClientRect().top;
            let closestSection = sections[0]?.id;
            let closestDistance = Infinity;

            // Find the section closest to the top of the container
            sections.forEach((section) => {
                const el = sectionRefs.current[section.id];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    const distance = Math.abs(rect.top - containerTop);

                    // Only consider sections that are at or above the viewport top (with small threshold)
                    if (rect.top <= containerTop + 10 && distance < closestDistance) {
                        closestDistance = distance;
                        closestSection = section.id;
                    }
                }
            });

            // If no section is at/above the top, use the first one
            if (closestDistance === Infinity && sections.length > 0) {
                closestSection = sections[0].id;
            }

            if (closestSection && closestSection !== currentSectionId) {
                setCurrentSectionId(closestSection);
            }
        };

        // Debounce scroll handler
        let rafId = null;
        const debouncedScroll = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(handleScroll);
        };

        container.addEventListener('scroll', debouncedScroll, { passive: true });

        // Initial check
        handleScroll();

        return () => {
            container.removeEventListener('scroll', debouncedScroll);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [sections, currentSectionId]);

    const classList = [
        'section-nav-group',
        `section-nav-group--${mode}`,
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classList}>
            {/* Navigation header with dots */}
            <SectionNavHeader
                sections={sectionConfigs}
                currentSectionId={currentSectionId}
                onSectionClick={scrollToSection}
                size={size}
            />

            {/* Scrollable content */}
            <div
                ref={scrollContainerRef}
                className="section-nav-group__content"
            >
                {sections.map((section) => (
                    <div
                        key={section.id}
                        ref={(el) => { sectionRefs.current[section.id] = el; }}
                        data-section-id={section.id}
                        className="section-nav-group__section"
                    >
                        <SectionHeader
                            icon={section.icon}
                            label={section.label}
                            color={section.color}
                            itemCount={section.itemCount}
                            isVR={isVR}
                        />
                        <div className="section-nav-group__section-content">
                            {section.content}
                        </div>
                    </div>
                ))}
                {/* Spacer to allow last section to scroll to top */}
                <div className="section-nav-group__spacer" />
            </div>
        </div>
    );
}

/**
 * Hook to help build section configs with children counting
 *
 * @param {Array} sectionDefs - Array of section definitions
 * @returns {SectionConfig[]} - Processed section configs with item counts
 */
export function useSectionNavSections(sectionDefs) {
    return useMemo(() => {
        return sectionDefs.map(def => ({
            id: def.id,
            icon: def.icon,
            label: def.label,
            color: def.color,
            content: def.content,
            itemCount: def.items?.length,
        }));
    }, [sectionDefs]);
}

export default SectionNavGroup;
