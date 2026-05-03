/**
 * @file FilterToolbar.jsx
 * @description Filter toolbar for the audit log
 */

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { OPERATION_TYPES, DATE_PRESETS } from '../CanvasOperationsPanel.logic';

/**
 * MultiSelectDropdown - Dropdown with multiple selection
 */
function MultiSelectDropdown({ label, options, selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedCount = selected.length;
  const allSelected = selectedCount === options.length;

  return (
    <div className="cop-multi-select">
      <button
        className={`cop-multi-select__trigger ${selectedCount > 0 && !allSelected ? 'cop-multi-select__trigger--filtered' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>{label}</span>
        {selectedCount > 0 && !allSelected && (
          <span className="cop-multi-select__badge">{selectedCount}</span>
        )}
        <Icon name="chevronDown" size={12} />
      </button>

      {isOpen && (
        <>
          <div
            className="cop-multi-select__overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="cop-multi-select__dropdown">
            {options.map(opt => {
              const isSelected = selected.includes(opt.value);
              const config = OPERATION_TYPES[opt.value];
              return (
                <button
                  key={opt.value}
                  className={`cop-multi-select__option ${isSelected ? 'cop-multi-select__option--selected' : ''}`}
                  onClick={() => {
                    if (isSelected) {
                      onChange(selected.filter(v => v !== opt.value));
                    } else {
                      onChange([...selected, opt.value]);
                    }
                  }}
                  type="button"
                >
                  <div className={`cop-multi-select__checkbox ${isSelected ? 'cop-multi-select__checkbox--checked' : ''}`}>
                    {isSelected && <Icon name="check" size={8} />}
                  </div>
                  {config && (
                    <div
                      className="cop-multi-select__icon"
                      style={{
                        background: `var(--color-accent-${config.color})20`,
                        color: `var(--color-accent-${config.color})`,
                      }}
                    >
                      <Icon name={config.icon} size={10} />
                    </div>
                  )}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * FilterToolbar - Second toolbar row with filters
 *
 * @param {Object} props - Component props
 * @param {Array} props.users - List of users
 * @param {string|null} props.userFilter - Current user filter
 * @param {Function} props.onUserFilterChange - Update user filter
 * @param {Array} props.typeFilter - Selected operation types
 * @param {Function} props.onTypeFilterChange - Update type filter
 * @param {string} props.datePreset - Current date preset
 * @param {Function} props.onDatePresetChange - Update date preset
 * @param {Object} props.customDateRange - Custom date range
 * @param {Function} props.onCustomDateRangeChange - Update custom range
 */
export function FilterToolbar({
  users = [],
  userFilter,
  onUserFilterChange,
  typeFilter = [],
  onTypeFilterChange,
  datePreset = 'all',
  onDatePresetChange,
  customDateRange = { start: '', end: '' },
  onCustomDateRangeChange,
}) {
  const showCustomRange = datePreset === 'custom';

  const operationTypeOptions = Object.entries(OPERATION_TYPES)
    .filter(([key]) => key !== 'REVERT')
    .map(([key, config]) => ({
      value: key,
      label: config.label,
    }));

  return (
    <div className="cop-toolbar cop-toolbar--wrap">
      {/* User filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name="person" size={12} style={{ color: 'var(--color-text-muted)' }} />
        <select
          className="cop-select"
          value={userFilter || ''}
          onChange={(e) => onUserFilterChange(e.target.value || null)}
        >
          <option value="">All users</option>
          {users.map(u => (
            <option key={u.name} value={u.name}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Operation type filter */}
      <MultiSelectDropdown
        label="Type"
        options={operationTypeOptions}
        selected={typeFilter}
        onChange={onTypeFilterChange}
      />

      {/* Date filter */}
      <div className="cop-date-range">
        <select
          className="cop-select"
          value={datePreset}
          onChange={(e) => onDatePresetChange(e.target.value)}
        >
          {DATE_PRESETS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        {showCustomRange && (
          <div className="cop-date-range__inputs">
            <input
              type="date"
              className="cop-date-range__input"
              value={customDateRange?.start || ''}
              onChange={(e) => onCustomDateRangeChange({
                ...customDateRange,
                start: e.target.value,
              })}
            />
            <span className="cop-date-range__separator">to</span>
            <input
              type="date"
              className="cop-date-range__input"
              value={customDateRange?.end || ''}
              onChange={(e) => onCustomDateRangeChange({
                ...customDateRange,
                end: e.target.value,
              })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default FilterToolbar;
