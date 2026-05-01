/**
 * @file TagChip.jsx
 * @description Tag chip component for displaying file tags with category colors.
 * Used in FileItem and filter displays.
 *
 * @example
 * <TagChip tag={{ name: 'Pre-op' }} category={{ color: '#8b5cf6' }} />
 * <TagChip tag={tag} category={category} removable onRemove={handleRemove} />
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context';
import './TagChip.scss';

/**
 * @typedef {Object} Tag
 * @property {string} id - Tag ID
 * @property {string} name - Tag display name
 * @property {string} categoryId - Parent category ID
 */

/**
 * @typedef {Object} TagCategory
 * @property {string} id - Category ID
 * @property {string} label - Display label
 * @property {string} color - Accent color (hex)
 */

/**
 * TagChip - Tag display with category color
 *
 * @param {Object} props
 * @param {Tag} props.tag - Tag to display
 * @param {TagCategory} [props.category] - Tag category (for color)
 * @param {'xs'|'sm'|'md'} [props.size='sm'] - Size variant
 * @param {boolean} [props.removable=false] - Show remove button
 * @param {boolean} [props.selected=false] - Selected state
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {function} [props.onClick] - Click handler
 * @param {function} [props.onRemove] - Remove handler
 * @param {string} [props.className] - Additional CSS classes
 */
export const TagChip = memo(function TagChip({
    tag,
    category,
    size = 'sm',
    removable = false,
    selected = false,
    disabled = false,
    onClick,
    onRemove,
    className = '',
}) {
    const { isVR } = useAdaptive();

    const color = category?.color || '#6b7280';
    const isInteractive = !!onClick && !disabled;

    const classList = [
        'tag-chip',
        `tag-chip--${size}`,
        selected && 'tag-chip--selected',
        disabled && 'tag-chip--disabled',
        isInteractive && 'tag-chip--interactive',
        removable && 'tag-chip--removable',
        isVR && 'tag-chip--vr',
        className,
    ].filter(Boolean).join(' ');

    const style = {
        '--tag-color': color,
        '--tag-bg': `${color}15`,
        '--tag-bg-hover': `${color}25`,
    };

    const handleClick = (e) => {
        if (isInteractive) {
            onClick(e, tag);
        }
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        if (onRemove && !disabled) {
            onRemove(e, tag);
        }
    };

    const handleKeyDown = (e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e, tag);
        }
    };

    const Component = isInteractive ? 'button' : 'span';
    const interactiveProps = isInteractive ? {
        type: 'button',
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        disabled,
    } : {};

    return (
        <Component
            className={classList}
            style={style}
            {...interactiveProps}
        >
            <span className="tag-chip__label">{tag.name}</span>
            {removable && (
                <button
                    type="button"
                    className="tag-chip__remove"
                    onClick={handleRemove}
                    disabled={disabled}
                    aria-label={`Remove ${tag.name}`}
                >
                    <Icon name="x" size={size === 'xs' ? 8 : size === 'sm' ? 10 : 12} />
                </button>
            )}
        </Component>
    );
});

/**
 * TagChipList - List of tag chips with overflow indicator
 *
 * @param {Object} props
 * @param {Tag[]} props.tags - Tags to display
 * @param {function} props.getCategoryForTag - Function to get category for a tag
 * @param {number} [props.maxVisible=2] - Maximum visible tags before overflow
 * @param {'xs'|'sm'|'md'} [props.size='xs'] - Size variant
 * @param {string} [props.className] - Additional CSS classes
 */
export const TagChipList = memo(function TagChipList({
    tags,
    getCategoryForTag,
    maxVisible = 2,
    size = 'xs',
    className = '',
}) {
    const { isVR } = useAdaptive();

    if (!tags || tags.length === 0) return null;

    const visibleTags = tags.slice(0, maxVisible);
    const overflowCount = tags.length - maxVisible;

    const classList = [
        'tag-chip-list',
        isVR && 'tag-chip-list--vr',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classList}>
            {visibleTags.map(tag => (
                <TagChip
                    key={tag.id}
                    tag={tag}
                    category={getCategoryForTag?.(tag.id)}
                    size={size}
                />
            ))}
            {overflowCount > 0 && (
                <span className="tag-chip-list__overflow">
                    +{overflowCount}
                </span>
            )}
        </div>
    );
});

export default TagChip;
