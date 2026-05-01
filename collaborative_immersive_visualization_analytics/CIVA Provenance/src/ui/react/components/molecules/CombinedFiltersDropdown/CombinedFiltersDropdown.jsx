/**
 * @file CombinedFiltersDropdown.jsx
 * @description Tabbed Types + Tags dropdown for minimal mode.
 *
 * NOTE: Sort is NOT included here - it has its own separate button.
 * This keeps the Filters dropdown focused on "what to show" while
 * Sort handles "how to order".
 */

import React, { memo, useState, useMemo, useRef, useEffect } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import { DropdownPortal } from '@UI/react/components/atoms/DropdownPortal';
import './CombinedFiltersDropdown.scss';

/**
 * CombinedFiltersDropdown - Tabbed Types + Tags dropdown for minimal mode
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dropdown is open
 * @param {Function} props.onClose - Close handler
 * @param {React.RefObject} props.triggerRef - Ref to trigger element
 *
 * Types props:
 * @param {Array} props.typeCategories - Type category definitions
 * @param {string[]} props.selectedTypes - Selected type IDs
 * @param {Object} props.typeCounts - Counts per type
 * @param {Function} props.onToggleType - Toggle type handler
 * @param {Function} props.onSelectAllTypes - Select all types handler
 * @param {Function} props.onClearAllTypes - Clear all types handler
 *
 * Tags props:
 * @param {Array} props.tags - Available tags
 * @param {Object} props.tagsByCategory - Tags grouped by category
 * @param {string[]} props.selectedTags - Selected tag IDs
 * @param {Function} props.onToggleTag - Toggle tag handler
 * @param {Function} props.onClearAllTags - Clear all tags handler
 *
 * @param {string} [props.className] - Additional CSS classes
 */
export const CombinedFiltersDropdown = memo(function CombinedFiltersDropdown({
  isOpen,
  onClose,
  triggerRef,

  // Types
  typeCategories = [],
  selectedTypes = [],
  typeCounts = {},
  onToggleType,
  onSelectAllTypes,
  onClearAllTypes,

  // Tags
  tags = [],
  tagsByCategory = {},
  selectedTags = [],
  onToggleTag,
  onClearAllTags,

  className = '',
}) {
  const { isVR } = useAdaptive();
  const searchInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('types');
  const [search, setSearch] = useState('');

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current && !isVR) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, isVR]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setActiveTab('types');
    }
  }, [isOpen]);

  // Filter types by search
  const filteredTypes = useMemo(() => {
    if (!search.trim()) {
      return typeCategories.flatMap((cat) => cat.types);
    }
    const query = search.toLowerCase();
    return typeCategories
      .flatMap((cat) => cat.types)
      .filter((t) => t.label.toLowerCase().includes(query));
  }, [typeCategories, search]);

  // Filter tags by search
  const filteredTags = useMemo(() => {
    if (!search.trim()) return tags;
    const query = search.toLowerCase();
    return tags.filter((t) => t.name?.toLowerCase().includes(query));
  }, [tags, search]);

  const hasTypes = typeCategories.length > 0;
  const hasTags = tags.length > 0;

  // Tabs - only Types and Tags (Sort has its own button)
  const tabItems = [
    hasTypes && {
      id: 'types',
      label: 'Types',
      icon: 'file',
      count: selectedTypes.length,
    },
    hasTags && {
      id: 'tags',
      label: 'Tags',
      icon: 'tag',
      count: selectedTags.length,
    },
  ].filter(Boolean);

  const classList = [
    'combined-filters-dropdown',
    isVR && 'combined-filters-dropdown--vr',
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
      <div className="combined-filters-dropdown__container">
        {/* Tabs */}
        {tabItems.length > 1 && (
          <div className="combined-filters-dropdown__tabs">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'combined-filters-dropdown__tab',
                  activeTab === tab.id &&
                    'combined-filters-dropdown__tab--active',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <Icon name={tab.icon} size={12} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="combined-filters-dropdown__tab-badge">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="combined-filters-dropdown__search">
          <div className="combined-filters-dropdown__search-wrapper">
            <Icon
              name="search"
              size={12}
              className="combined-filters-dropdown__search-icon"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={
                activeTab === 'types' ? 'Search types...' : 'Search tags...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="combined-filters-dropdown__search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="combined-filters-dropdown__search-clear"
                aria-label="Clear search"
              >
                <Icon name="x" size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Types Tab Content */}
        {activeTab === 'types' && hasTypes && (
          <div className="combined-filters-dropdown__content">
            <div className="combined-filters-dropdown__actions">
              <button type="button" onClick={onSelectAllTypes}>
                Select All
              </button>
              <span className="combined-filters-dropdown__separator">|</span>
              <button
                type="button"
                onClick={onClearAllTypes}
                disabled={selectedTypes.length === 0}
              >
                Clear ({selectedTypes.length})
              </button>
            </div>

            <div className="combined-filters-dropdown__options">
              {typeCategories.map((category) => (
                <div key={category.id} className="combined-filters-dropdown__category">
                  <div className="combined-filters-dropdown__category-header">
                    <Icon name={category.icon} size={11} />
                    <span>{category.label}</span>
                  </div>
                  {category.types
                    .filter(
                      (type) =>
                        !search.trim() ||
                        type.label.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((type) => {
                      const count = typeCounts[type.id] || 0;
                      const isSelected = selectedTypes.includes(type.id);
                      const isEmpty = count === 0;

                      return (
                        <label
                          key={type.id}
                          className={[
                            'combined-filters-dropdown__option',
                            isEmpty && 'combined-filters-dropdown__option--empty',
                            isSelected && 'combined-filters-dropdown__option--selected',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isEmpty}
                            onChange={() => !isEmpty && onToggleType(type.id)}
                          />
                          <span className="combined-filters-dropdown__option-label">
                            {type.label}
                          </span>
                          <span className="combined-filters-dropdown__option-count">
                            ({count})
                          </span>
                        </label>
                      );
                    })}
                </div>
              ))}
            </div>

            {filteredTypes.length === 0 && (
              <div className="combined-filters-dropdown__empty">
                No types match "{search}"
              </div>
            )}
          </div>
        )}

        {/* Tags Tab Content */}
        {activeTab === 'tags' && hasTags && (
          <div className="combined-filters-dropdown__content">
            <div className="combined-filters-dropdown__actions">
              <button
                type="button"
                onClick={onClearAllTags}
                disabled={selectedTags.length === 0}
              >
                Clear All ({selectedTags.length})
              </button>
            </div>

            <div className="combined-filters-dropdown__tag-chips">
              {filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => onToggleTag(tag.id)}
                    className={[
                      'combined-filters-dropdown__tag-chip',
                      isSelected && 'combined-filters-dropdown__tag-chip--selected',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      '--tag-color': tag.color || '#6b7280',
                    }}
                  >
                    {tag.name}
                    {tag.count !== undefined && (
                      <span className="combined-filters-dropdown__tag-count">
                        {tag.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {filteredTags.length === 0 && (
              <div className="combined-filters-dropdown__empty">
                {search ? `No tags match "${search}"` : 'No tags available'}
              </div>
            )}
          </div>
        )}
      </div>
    </DropdownPortal>
  );
});

export default CombinedFiltersDropdown;
