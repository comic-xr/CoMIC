/**
 * @file TypeFilterDropdown.jsx
 * @description Categorized multi-select dropdown for type filtering.
 *
 * FEATURES:
 * - Searchable within dropdown
 * - Categorized with headers
 * - Count per type
 * - Select All / Clear actions
 * - Disabled state for types with 0 count
 */

import React, { memo, useState, useMemo, useRef, useEffect } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import { DropdownPortal } from '@UI/react/components/atoms/DropdownPortal';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import './TypeFilterDropdown.scss';

/**
 * TypeFilterDropdown - Categorized multi-select dropdown for type filtering
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dropdown is open
 * @param {Function} props.onClose - Close handler
 * @param {React.RefObject} props.triggerRef - Ref to trigger element for positioning
 * @param {Array} props.categories - Type categories with types array
 * @param {string[]} props.selectedTypes - Currently selected type IDs
 * @param {Object} props.typeCounts - Counts per type: { typeId: number }
 * @param {Function} props.onToggleType - Toggle type handler (typeId) => void
 * @param {Function} props.onSelectAll - Select all types handler
 * @param {Function} props.onClearAll - Clear all types handler
 * @param {string} [props.className] - Additional CSS classes
 */
export const TypeFilterDropdown = memo(function TypeFilterDropdown({
  isOpen,
  onClose,
  triggerRef,
  categories = [],
  selectedTypes = [],
  typeCounts = {},
  onToggleType,
  onSelectAll,
  onClearAll,
  className = '',
}) {
  const { isVR } = useAdaptive();
  const searchInputRef = useRef(null);
  const [search, setSearch] = useState('');

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current && !isVR) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, isVR]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const query = search.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        types: cat.types.filter((t) =>
          t.label.toLowerCase().includes(query)
        ),
      }))
      .filter((cat) => cat.types.length > 0);
  }, [categories, search]);

  // Count totals
  const totalTypes = categories.flatMap((c) => c.types).length;
  const selectedCount = selectedTypes.length;

  const classList = [
    'type-filter-dropdown',
    isVR && 'type-filter-dropdown--vr',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <DropdownPortal
      open={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      align="start"
      position="bottom"
      offset={4}
      className={classList}
    >
      <div className="type-filter-dropdown__container">
        {/* Search */}
        <div className="type-filter-dropdown__search">
          <SearchInput
            ref={searchInputRef}
            className="type-filter-dropdown__search-input"
            value={search}
            onChange={setSearch}
            placeholder="Search types..."
            size="sm"
          />
        </div>

        {/* Quick actions */}
        <div className="type-filter-dropdown__actions">
          <button
            type="button"
            onClick={onSelectAll}
            className="type-filter-dropdown__action"
          >
            Select All
          </button>
          <span className="type-filter-dropdown__separator">|</span>
          <button
            type="button"
            onClick={onClearAll}
            className="type-filter-dropdown__action"
            disabled={selectedCount === 0}
          >
            Clear ({selectedCount})
          </button>
        </div>

        {/* Categories */}
        <div className="type-filter-dropdown__categories">
          {filteredCategories.map((category) => (
            <div key={category.id} className="type-filter-dropdown__category">
              <div className="type-filter-dropdown__category-header">
                <Icon name={category.icon} size={11} />
                <span>{category.label}</span>
              </div>

              <div className="type-filter-dropdown__options">
                {category.types.map((type) => {
                  const count = typeCounts[type.id] || 0;
                  const isSelected = selectedTypes.includes(type.id);
                  const isEmpty = count === 0;

                  return (
                    <label
                      key={type.id}
                      className={[
                        'type-filter-dropdown__option',
                        isEmpty && 'type-filter-dropdown__option--empty',
                        isSelected && 'type-filter-dropdown__option--selected',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isEmpty}
                        onChange={() => !isEmpty && onToggleType(type.id)}
                        className="type-filter-dropdown__checkbox"
                      />
                      <span className="type-filter-dropdown__option-label">
                        {type.label}
                      </span>
                      <span className="type-filter-dropdown__option-count">
                        ({count})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="type-filter-dropdown__empty">
              No types match "{search}"
            </div>
          )}
        </div>
      </div>
    </DropdownPortal>
  );
});

export default TypeFilterDropdown;
