/**
 * @file ShortcutCategory.jsx
 * @description Category tab button component for the keyboard shortcuts modal.
 * Used in the left sidebar to switch between shortcut categories.
 *
 * @example
 * <ShortcutCategory
 *   id="general"
 *   label="General"
 *   icon={Settings}
 *   isActive={activeCategory === 'general'}
 *   onClick={() => setActiveCategory('general')}
 * />
 */

import React, { memo, forwardRef } from 'react';

/**
 * @typedef {Object} ShortcutCategoryProps
 * @property {string} id - Category identifier
 * @property {string} label - Display label
 * @property {React.ComponentType} icon - Lucide icon component
 * @property {boolean} isActive - Whether this category is selected
 * @property {() => void} onClick - Click handler
 * @property {(event: KeyboardEvent) => void} [onKeyDown] - Keyboard handler
 * @property {string} [className] - Additional CSS class
 */

/**
 * Category tab button component.
 *
 * @param {ShortcutCategoryProps} props - Component props
 * @param {React.Ref} ref - Forwarded ref
 * @returns {React.ReactElement} The rendered category button
 */
const ShortcutCategory = forwardRef(function ShortcutCategory({
    id,
    label,
    icon: Icon,
    isActive,
    onClick,
    onKeyDown,
    className = ''
}, ref) {
    const buttonClassNames = [
        'shortcuts-modal__category-btn',
        isActive && 'shortcuts-modal__category-btn--active',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            ref={ref}
            type="button"
            className={buttonClassNames}
            onClick={onClick}
            onKeyDown={onKeyDown}
            role="tab"
            aria-selected={isActive}
            aria-controls={`shortcuts-panel-${id}`}
            id={`shortcuts-tab-${id}`}
            tabIndex={isActive ? 0 : -1}
        >
            {Icon && (
                <span className="shortcuts-modal__category-btn__icon">
                    <Icon size={16} />
                </span>
            )}
            <span className="shortcuts-modal__category-btn__label">{label}</span>
        </button>
    );
});

export default memo(ShortcutCategory);
export { ShortcutCategory };