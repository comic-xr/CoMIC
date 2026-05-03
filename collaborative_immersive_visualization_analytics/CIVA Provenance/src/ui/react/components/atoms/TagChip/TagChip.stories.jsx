import React, { useState } from 'react';
import { TagChip, TagChipList } from './TagChip';

export default {
    title: 'Atoms/TagChip',
    component: TagChip,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md'],
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '24px', background: '#0f0f0f', borderRadius: '8px', minWidth: '300px' }}>
                <Story />
            </div>
        ),
    ],
};

// Sample tags and categories
const SAMPLE_CATEGORIES = {
    phase: { id: 'phase', label: 'Study Phase', color: '#8b5cf6' },
    status: { id: 'status', label: 'Status', color: '#f59e0b' },
    cohort: { id: 'cohort', label: 'Cohort', color: '#10b981' },
};

const SAMPLE_TAGS = [
    { id: 'pre-op', name: 'Pre-op', categoryId: 'phase' },
    { id: 'post-op', name: 'Post-op', categoryId: 'phase' },
    { id: 'pending', name: 'Pending Review', categoryId: 'status' },
    { id: 'control', name: 'Control', categoryId: 'cohort' },
    { id: 'treatment', name: 'Treatment', categoryId: 'cohort' },
];

const getCategoryForTag = (tagId) => {
    const tag = SAMPLE_TAGS.find(t => t.id === tagId);
    return tag ? SAMPLE_CATEGORIES[tag.categoryId] : null;
};

// Basic TagChip
export const Default = {
    args: {
        tag: { id: 'pre-op', name: 'Pre-op' },
        category: SAMPLE_CATEGORIES.phase,
        size: 'sm',
    },
};

// Size variants
export const Sizes = () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <TagChip
            tag={{ id: '1', name: 'Extra Small' }}
            category={SAMPLE_CATEGORIES.phase}
            size="xs"
        />
        <TagChip
            tag={{ id: '2', name: 'Small' }}
            category={SAMPLE_CATEGORIES.status}
            size="sm"
        />
        <TagChip
            tag={{ id: '3', name: 'Medium' }}
            category={SAMPLE_CATEGORIES.cohort}
            size="md"
        />
    </div>
);

// Different categories (colors)
export const Categories = () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {SAMPLE_TAGS.map(tag => (
            <TagChip
                key={tag.id}
                tag={tag}
                category={SAMPLE_CATEGORIES[tag.categoryId]}
                size="sm"
            />
        ))}
    </div>
);

// Interactive (clickable)
export const Interactive = () => {
    const [selected, setSelected] = useState(null);

    return (
        <div style={{ display: 'flex', gap: '8px' }}>
            {SAMPLE_TAGS.slice(0, 3).map(tag => (
                <TagChip
                    key={tag.id}
                    tag={tag}
                    category={SAMPLE_CATEGORIES[tag.categoryId]}
                    size="sm"
                    selected={selected === tag.id}
                    onClick={() => setSelected(tag.id)}
                />
            ))}
        </div>
    );
};

// Removable
export const Removable = () => {
    const [tags, setTags] = useState(SAMPLE_TAGS.slice(0, 3));

    const handleRemove = (e, tag) => {
        setTags(prev => prev.filter(t => t.id !== tag.id));
    };

    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {tags.map(tag => (
                <TagChip
                    key={tag.id}
                    tag={tag}
                    category={SAMPLE_CATEGORIES[tag.categoryId]}
                    size="sm"
                    removable
                    onRemove={handleRemove}
                />
            ))}
            {tags.length === 0 && (
                <span style={{ color: '#6b7280', fontSize: '12px' }}>
                    All tags removed. Refresh to reset.
                </span>
            )}
        </div>
    );
};

// Selected state
export const Selected = () => (
    <div style={{ display: 'flex', gap: '8px' }}>
        <TagChip
            tag={{ id: '1', name: 'Normal' }}
            category={SAMPLE_CATEGORIES.phase}
            size="sm"
        />
        <TagChip
            tag={{ id: '2', name: 'Selected' }}
            category={SAMPLE_CATEGORIES.phase}
            size="sm"
            selected
        />
    </div>
);

// Disabled
export const Disabled = () => (
    <div style={{ display: 'flex', gap: '8px' }}>
        <TagChip
            tag={{ id: '1', name: 'Disabled' }}
            category={SAMPLE_CATEGORIES.phase}
            size="sm"
            disabled
        />
        <TagChip
            tag={{ id: '2', name: 'Disabled + Removable' }}
            category={SAMPLE_CATEGORIES.status}
            size="sm"
            disabled
            removable
        />
    </div>
);

// TagChipList with overflow
export const ChipList = () => (
    <div style={{
        width: '200px',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '8px',
    }}>
        <TagChipList
            tags={SAMPLE_TAGS}
            getCategoryForTag={getCategoryForTag}
            maxVisible={2}
            size="xs"
        />
        <p style={{ color: '#6b7280', fontSize: '10px', marginTop: '8px' }}>
            Shows 2 tags with +N overflow indicator
        </p>
    </div>
);

// TagChipList showing all
export const ChipListFull = () => (
    <div style={{
        width: '300px',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '8px',
    }}>
        <TagChipList
            tags={SAMPLE_TAGS}
            getCategoryForTag={getCategoryForTag}
            maxVisible={10}
            size="sm"
        />
    </div>
);
