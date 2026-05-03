// src/ui/react/components/common/ChipGroup/ChipGroup.stories.jsx
// Storybook stories for ChipGroup component

import { useState } from 'react';
import { ChipGroup, Chip, useChipGroup } from './ChipGroup';
import { Icon } from '@UI/react/components/atoms/Icon';

export default {
    title: 'Molecules/ChipGroup',
    component: ChipGroup,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '24px', background: '#0f0f0f', borderRadius: '8px', minWidth: '300px' }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// BASIC USAGE
// =============================================================================

export const Default = () => {
    const [active, setActive] = useState(['option1', 'option3']);

    const chips = [
        { id: 'option1', label: 'Option 1' },
        { id: 'option2', label: 'Option 2' },
        { id: 'option3', label: 'Option 3' },
    ];

    const handleToggle = (id) => {
        setActive(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    return (
        <ChipGroup
            chips={chips}
            activeChips={active}
            onToggle={handleToggle}
        />
    );
};

// =============================================================================
// SCOPE FILTERS (Project | Room | Personal)
// =============================================================================

export const ScopeFilters = () => {
    const [active, setActive] = useState(['project', 'room', 'personal']);

    const chips = [
        { id: 'project', label: 'Project', icon: 'globe', color: 'amber' },
        { id: 'room', label: 'This Room', icon: 'users', color: 'teal' },
        { id: 'personal', label: 'Personal', icon: 'userCircle', color: 'blue' },
    ];

    const handleToggle = (id) => {
        setActive(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    return (
        <div>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>
                Scope Filters
            </div>
            <ChipGroup
                chips={chips}
                activeChips={active}
                onToggle={handleToggle}
            />
        </div>
    );
};

// =============================================================================
// ANNOTATION TYPE FILTERS
// =============================================================================

export const AnnotationTypeFilters = () => {
    const [active, setActive] = useState(['point', 'ruler']);

    const chips = [
        { id: 'point', label: 'Point', icon: 'mapPin', color: 'blue' },
        { id: 'ruler', label: 'Ruler', icon: 'ruler', color: 'green' },
        { id: 'region', label: 'Region', icon: 'box', color: 'purple' },
        { id: 'note', label: 'Note', icon: 'messageSquare', color: 'amber' },
    ];

    const handleToggle = (id) => {
        setActive(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    return (
        <div>
            <div style={{ color: '#666', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>
                Filter by Type
            </div>
            <ChipGroup
                chips={chips}
                activeChips={active}
                onToggle={handleToggle}
            />
        </div>
    );
};

// =============================================================================
// WITH COUNTS
// =============================================================================

export const WithCounts = () => {
    const [active, setActive] = useState(['project', 'personal']);

    const chips = [
        { id: 'project', label: 'Project', icon: 'globe', color: 'amber', count: 12 },
        { id: 'room', label: 'Room', icon: 'users', color: 'teal', count: 5 },
        { id: 'personal', label: 'Personal', icon: 'userCircle', color: 'blue', count: 23 },
    ];

    const handleToggle = (id) => {
        setActive(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    return (
        <ChipGroup
            chips={chips}
            activeChips={active}
            onToggle={handleToggle}
        />
    );
};

// =============================================================================
// USING THE HOOK
// =============================================================================

export const WithUseChipGroupHook = () => {
    const allChipIds = ['starred', 'recent', 'shared'];
    const { activeChips, toggle, selectAll, clearAll } = useChipGroup(['starred']);

    const chips = [
        { id: 'starred', label: 'Starred', icon: 'star', color: 'amber' },
        { id: 'recent', label: 'Recent', icon: 'eye', color: 'blue' },
        { id: 'shared', label: 'Shared', icon: 'users', color: 'pink' },
    ];

    return (
        <div>
            <ChipGroup
                chips={chips}
                activeChips={activeChips}
                onToggle={toggle}
            />
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => selectAll(allChipIds)}
                    style={{
                        padding: '4px 8px',
                        background: '#333',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#aaa',
                        fontSize: '11px',
                        cursor: 'pointer',
                    }}
                >
                    Select All
                </button>
                <button
                    onClick={clearAll}
                    style={{
                        padding: '4px 8px',
                        background: '#333',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#aaa',
                        fontSize: '11px',
                        cursor: 'pointer',
                    }}
                >
                    Clear All
                </button>
            </div>
        </div>
    );
};

// =============================================================================
// SMALL SIZE
// =============================================================================

export const SmallSize = () => {
    const [active, setActive] = useState(['visible']);

    const chips = [
        { id: 'visible', label: 'Visible', icon: 'eye', color: 'green' },
        { id: 'hidden', label: 'Hidden', icon: 'eyeOff', color: 'red' },
    ];

    const handleToggle = (id) => {
        setActive(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    return (
        <ChipGroup
            chips={chips}
            activeChips={active}
            onToggle={handleToggle}
            size="sm"
        />
    );
};

// =============================================================================
// WITH DISABLED CHIPS
// =============================================================================

export const WithDisabledChip = () => {
    const [active, setActive] = useState(['filter1']);

    const chips = [
        { id: 'filter1', label: 'Active Filter', icon: 'filter', color: 'blue' },
        { id: 'filter2', label: 'Available', icon: 'filter', color: 'green' },
        { id: 'filter3', label: 'Premium Only', icon: 'star', color: 'amber', disabled: true },
    ];

    const handleToggle = (id) => {
        setActive(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    return (
        <ChipGroup
            chips={chips}
            activeChips={active}
            onToggle={handleToggle}
        />
    );
};

// =============================================================================
// ALL COLOR VARIANTS
// =============================================================================

export const ColorVariants = () => {
    const [active, setActive] = useState(['blue', 'green', 'pink', 'amber', 'teal', 'purple', 'red']);

    const chips = [
        { id: 'blue', label: 'Blue', color: 'blue' },
        { id: 'green', label: 'Green', color: 'green' },
        { id: 'pink', label: 'Pink', color: 'pink' },
        { id: 'amber', label: 'Amber', color: 'amber' },
        { id: 'teal', label: 'Teal', color: 'teal' },
        { id: 'purple', label: 'Purple', color: 'purple' },
        { id: 'red', label: 'Red', color: 'red' },
    ];

    const handleToggle = (id) => {
        setActive(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    return (
        <ChipGroup
            chips={chips}
            activeChips={active}
            onToggle={handleToggle}
        />
    );
};

// =============================================================================
// IN PANEL CONTEXT
// =============================================================================

export const InPanelContext = () => {
    const [activeScopes, setActiveScopes] = useState(['project', 'room', 'personal']);
    const [activeTypes, setActiveTypes] = useState(['point', 'ruler', 'region', 'note']);

    const scopeChips = [
        { id: 'project', label: 'Project', icon: 'globe', color: 'amber', count: 8 },
        { id: 'room', label: 'Room', icon: 'users', color: 'teal', count: 3 },
        { id: 'personal', label: 'Personal', icon: 'userCircle', color: 'blue', count: 12 },
    ];

    const typeChips = [
        { id: 'point', label: 'Point', icon: 'mapPin', color: 'blue' },
        { id: 'ruler', label: 'Ruler', icon: 'ruler', color: 'green' },
        { id: 'region', label: 'Region', icon: 'box', color: 'purple' },
        { id: 'note', label: 'Note', icon: 'messageSquare', color: 'amber' },
    ];

    const toggleScope = (id) => {
        setActiveScopes(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleType = (id) => {
        setActiveTypes(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <div style={{
            width: '280px',
            background: '#1a1a1a',
            borderRadius: '8px',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}>
                <Icon name="mapPin" size={14} color="#f472b6" />
                <span style={{ color: '#e0e0e0', fontWeight: 600, fontSize: '13px' }}>
                    Annotations
                </span>
                <span style={{ color: '#666', fontSize: '11px', marginLeft: 'auto' }}>
                    23 total
                </span>
            </div>

            {/* Scope filters */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: '#666', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Scope
                </div>
                <ChipGroup
                    chips={scopeChips}
                    activeChips={activeScopes}
                    onToggle={toggleScope}
                    size="sm"
                />
            </div>

            {/* Type filters */}
            <div style={{ padding: '12px 16px' }}>
                <div style={{ color: '#666', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Type
                </div>
                <ChipGroup
                    chips={typeChips}
                    activeChips={activeTypes}
                    onToggle={toggleType}
                    size="sm"
                />
            </div>
        </div>
    );
};