/**
 * QuickFilterChip Stories
 *
 * Toggleable filter chip with count badge.
 */

import React, { useState } from 'react';
import { QuickFilterChip } from './QuickFilterChip';

export default {
  title: 'Molecules/QuickFilterChip',
  component: QuickFilterChip,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    active: { control: 'boolean' },
    compact: { control: 'boolean' },
    disabled: { control: 'boolean' },
    count: { control: { type: 'number', min: 0, max: 999 } },
  },
};

// Default story with controls
export const Default = {
  args: {
    id: 'loaded',
    label: 'Loaded',
    icon: 'checkCircle',
    count: 42,
    active: false,
    compact: false,
    disabled: false,
  },
};

// Active state
export const Active = {
  args: {
    ...Default.args,
    active: true,
  },
};

// Compact mode (icon + count only)
export const Compact = {
  args: {
    ...Default.args,
    compact: true,
  },
};

// Compact active
export const CompactActive = {
  args: {
    ...Default.args,
    compact: true,
    active: true,
  },
};

// Disabled state
export const Disabled = {
  args: {
    ...Default.args,
    disabled: true,
  },
};

// Interactive example with multiple chips
export const FilterGroup = () => {
  const [activeFilters, setActiveFilters] = useState(['loaded']);

  const filters = [
    { id: 'loaded', label: 'Loaded', icon: 'checkCircle', count: 12 },
    { id: 'starred', label: 'Starred', icon: 'star', count: 5 },
    { id: 'shared', label: 'Shared', icon: 'users', count: 8 },
    { id: 'linked', label: 'Linked', icon: 'link2', count: 3 },
  ];

  const toggleFilter = (id) => {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {filters.map((filter) => (
        <QuickFilterChip
          key={filter.id}
          {...filter}
          active={activeFilters.includes(filter.id)}
          onClick={toggleFilter}
        />
      ))}
    </div>
  );
};

// Compact filter group
export const CompactFilterGroup = () => {
  const [activeFilters, setActiveFilters] = useState([]);

  const filters = [
    { id: 'loaded', label: 'Loaded', icon: 'checkCircle', count: 12 },
    { id: 'starred', label: 'Starred', icon: 'star', count: 5 },
    { id: 'shared', label: 'Shared', icon: 'users', count: 8 },
    { id: 'linked', label: 'Linked', icon: 'link2', count: 3 },
  ];

  const toggleFilter = (id) => {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {filters.map((filter) => (
        <QuickFilterChip
          key={filter.id}
          {...filter}
          compact
          active={activeFilters.includes(filter.id)}
          onClick={toggleFilter}
        />
      ))}
    </div>
  );
};

// Different icons showcase
export const IconVariants = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    <QuickFilterChip id="1" label="Active" icon="circleCheck" count={10} />
    <QuickFilterChip id="2" label="Visible" icon="eye" count={25} active />
    <QuickFilterChip id="3" label="Pinned" icon="pin" count={3} />
    <QuickFilterChip id="4" label="Discussed" icon="messageCircle" count={7} />
    <QuickFilterChip id="5" label="Recent" icon="clock" count={15} active />
  </div>
);

// Zero count (empty filter)
export const ZeroCount = {
  args: {
    ...Default.args,
    count: 0,
  },
};

// Large count
export const LargeCount = {
  args: {
    ...Default.args,
    count: 999,
  },
};
