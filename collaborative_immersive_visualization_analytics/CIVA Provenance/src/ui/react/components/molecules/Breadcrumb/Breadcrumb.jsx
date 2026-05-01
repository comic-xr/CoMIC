/**
 * @file Breadcrumb.jsx
 * @description Folder path navigation breadcrumb for file browser.
 * Shows current location with clickable path segments.
 *
 * @example
 * <Breadcrumb
 *   path={[{ id: '1', name: 'Raw Scans' }, { id: '2', name: 'Session 1' }]}
 *   onNavigate={handleNavigate}
 * />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';
import './Breadcrumb.scss';

/**
 * @typedef {Object} BreadcrumbSegment
 * @property {string} id - Folder identifier
 * @property {string} name - Folder display name
 */

/**
 * @typedef {Object} BreadcrumbProps
 * @property {BreadcrumbSegment[]} path - Array of path segments
 * @property {(folderId: string|null) => void} onNavigate - Navigation handler (null for root)
 * @property {string} [className] - Additional CSS classes
 * @property {string} [rootLabel='Root'] - Label for root path
 * @property {boolean} [showHomeIcon=true] - Show home icon for root
 */

/**
 * Breadcrumb - Folder path navigation
 *
 * @param {BreadcrumbProps} props - Component props
 * @returns {React.ReactElement} The rendered breadcrumb
 */
export const Breadcrumb = memo(function Breadcrumb({
    path = [],
    onNavigate,
    className = '',
    rootLabel = 'Root',
    showHomeIcon = true,
}) {
    const { isVR } = useAdaptive();

    const classList = [
        'breadcrumb',
        isVR && 'breadcrumb--vr',
        className,
    ].filter(Boolean).join(' ');

    const isAtRoot = path.length === 0;

    return (
        <nav className={classList} aria-label="Folder navigation">
            {/* Root button */}
            <button
                type="button"
                className={`breadcrumb__segment ${isAtRoot ? 'breadcrumb__segment--active' : ''}`}
                onClick={() => onNavigate(null)}
                aria-current={isAtRoot ? 'page' : undefined}
            >
                {showHomeIcon && (
                    <Icon name="home" size={10} className="breadcrumb__icon" />
                )}
                <span className="breadcrumb__label">{rootLabel}</span>
            </button>

            {/* Path segments */}
            {path.map((segment, index) => {
                const isLast = index === path.length - 1;

                return (
                    <React.Fragment key={segment.id}>
                        <Icon
                            name="chevronRight"
                            size={10}
                            className="breadcrumb__separator"
                        />
                        <button
                            type="button"
                            className={`breadcrumb__segment ${isLast ? 'breadcrumb__segment--active' : ''}`}
                            onClick={() => onNavigate(segment.id)}
                            aria-current={isLast ? 'page' : undefined}
                            title={segment.name}
                        >
                            <span className="breadcrumb__label">{segment.name}</span>
                        </button>
                    </React.Fragment>
                );
            })}
        </nav>
    );
});

/**
 * Build breadcrumb path from folder hierarchy
 *
 * @param {string|null} currentFolderId - Current folder ID
 * @param {Array} folders - All folders array
 * @returns {BreadcrumbSegment[]} Path segments from root to current folder
 */
export function buildBreadcrumbPath(currentFolderId, folders) {
    if (!currentFolderId) return [];

    const path = [];
    let current = folders.find(f => f.id === currentFolderId);

    while (current) {
        path.unshift({ id: current.id, name: current.name });
        current = folders.find(f => f.id === current.parentId);
    }

    return path;
}

export default Breadcrumb;
