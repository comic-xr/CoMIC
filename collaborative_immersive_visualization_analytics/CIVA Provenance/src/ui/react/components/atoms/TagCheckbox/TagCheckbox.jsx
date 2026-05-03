/**
 * @file TagCheckbox.jsx
 * @description Checkbox item for tag selection in dropdowns.
 * Shows tag name with category color indicator and file count.
 *
 * @example
 * <TagCheckbox
 *   tag={{ id: 'tag-1', name: 'Pre-op' }}
 *   category={{ color: '#8b5cf6' }}
 *   checked={true}
 *   count={5}
 *   onChange={handleToggle}
 * />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';
import './TagCheckbox.scss';

/**
 * TagCheckbox - Checkbox item for tag selection
 *
 * @param {Object} props
 * @param {Object} props.tag - Tag object { id, name, categoryId }
 * @param {Object} props.category - Category object { id, color, label }
 * @param {boolean} props.checked - Whether tag is selected
 * @param {number} [props.count] - Number of files with this tag
 * @param {function} props.onChange - Toggle handler
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className] - Additional CSS classes
 */
export const TagCheckbox = memo(function TagCheckbox({
    tag,
    category,
    checked,
    count,
    onChange,
    disabled = false,
    className = '',
}) {
    const { isVR } = useAdaptive();

    const color = category?.color || '#6b7280';

    const classList = [
        'tag-checkbox',
        checked && 'tag-checkbox--checked',
        disabled && 'tag-checkbox--disabled',
        isVR && 'tag-checkbox--vr',
        className,
    ].filter(Boolean).join(' ');

    const handleClick = () => {
        if (!disabled && onChange) {
            onChange(tag.id);
        }
    };

    const handleKeyDown = (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            onChange?.(tag.id);
        }
    };

    return (
        <button
            type="button"
            className={classList}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            role="checkbox"
            aria-checked={checked}
        >
            {/* Checkbox indicator */}
            <span
                className="tag-checkbox__box"
                style={{
                    borderColor: color,
                    background: checked ? color : 'transparent',
                }}
            >
                {checked && (
                    <Icon name="check" size={10} className="tag-checkbox__check" />
                )}
            </span>

            {/* Tag name */}
            <span className="tag-checkbox__label">{tag.name}</span>

            {/* File count */}
            {count !== undefined && (
                <span className="tag-checkbox__count">{count}</span>
            )}
        </button>
    );
});

export default TagCheckbox;
