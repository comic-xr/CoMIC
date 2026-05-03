import React, { useState } from 'react';
import { TagCheckbox } from './TagCheckbox';

export default {
    title: 'Atoms/TagCheckbox',
    component: TagCheckbox,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '24px', background: '#0f0f0f', borderRadius: '8px', minWidth: '280px' }}>
                <Story />
            </div>
        ),
    ],
};

// Sample categories and tags
const SAMPLE_CATEGORIES = {
    phase: { id: 'phase', label: 'Study Phase', color: '#8b5cf6' },
    status: { id: 'status', label: 'Status', color: '#f59e0b' },
    cohort: { id: 'cohort', label: 'Cohort', color: '#10b981' },
};

const SAMPLE_TAGS = [
    { id: 'pre-op', name: 'Pre-op', categoryId: 'phase', count: 12 },
    { id: 'post-op', name: 'Post-op', categoryId: 'phase', count: 8 },
    { id: 'pending', name: 'Pending Review', categoryId: 'status', count: 5 },
    { id: 'approved', name: 'Approved', categoryId: 'status', count: 15 },
    { id: 'control', name: 'Control', categoryId: 'cohort', count: 10 },
    { id: 'treatment', name: 'Treatment', categoryId: 'cohort', count: 14 },
];

// Basic TagCheckbox
export const Default = {
    args: {
        tag: { id: 'pre-op', name: 'Pre-op' },
        category: SAMPLE_CATEGORIES.phase,
        checked: false,
        count: 12,
    },
};

// Checked state
export const Checked = {
    args: {
        tag: { id: 'pre-op', name: 'Pre-op' },
        category: SAMPLE_CATEGORIES.phase,
        checked: true,
        count: 12,
    },
};

// Interactive example
export const Interactive = () => {
    const [selectedTags, setSelectedTags] = useState(new Set(['pre-op']));

    const handleToggle = (tagId) => {
        setSelectedTags(prev => {
            const next = new Set(prev);
            if (next.has(tagId)) {
                next.delete(tagId);
            } else {
                next.add(tagId);
            }
            return next;
        });
    };

    return (
        <div style={{ width: '240px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {Object.entries(SAMPLE_CATEGORIES).map(([catId, category]) => (
                <div key={catId}>
                    <div style={{
                        padding: '6px 12px',
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: category.color,
                    }}>
                        {category.label}
                    </div>
                    {SAMPLE_TAGS.filter(t => t.categoryId === catId).map(tag => (
                        <TagCheckbox
                            key={tag.id}
                            tag={tag}
                            category={category}
                            checked={selectedTags.has(tag.id)}
                            count={tag.count}
                            onChange={handleToggle}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

// Different category colors
export const CategoryColors = () => (
    <div style={{ width: '200px' }}>
        <TagCheckbox
            tag={{ id: '1', name: 'Phase Tag' }}
            category={SAMPLE_CATEGORIES.phase}
            checked={true}
            count={12}
            onChange={() => {}}
        />
        <TagCheckbox
            tag={{ id: '2', name: 'Status Tag' }}
            category={SAMPLE_CATEGORIES.status}
            checked={true}
            count={8}
            onChange={() => {}}
        />
        <TagCheckbox
            tag={{ id: '3', name: 'Cohort Tag' }}
            category={SAMPLE_CATEGORIES.cohort}
            checked={true}
            count={5}
            onChange={() => {}}
        />
    </div>
);

// Without count
export const WithoutCount = {
    args: {
        tag: { id: 'pre-op', name: 'Pre-op' },
        category: SAMPLE_CATEGORIES.phase,
        checked: false,
    },
};

// Disabled
export const Disabled = () => (
    <div style={{ width: '200px' }}>
        <TagCheckbox
            tag={{ id: '1', name: 'Disabled unchecked' }}
            category={SAMPLE_CATEGORIES.phase}
            checked={false}
            count={12}
            disabled
            onChange={() => {}}
        />
        <TagCheckbox
            tag={{ id: '2', name: 'Disabled checked' }}
            category={SAMPLE_CATEGORIES.status}
            checked={true}
            count={8}
            disabled
            onChange={() => {}}
        />
    </div>
);

// Long tag names
export const LongNames = () => (
    <div style={{ width: '200px' }}>
        <TagCheckbox
            tag={{ id: '1', name: 'Very Long Tag Name That Should Truncate' }}
            category={SAMPLE_CATEGORIES.phase}
            checked={false}
            count={12}
            onChange={() => {}}
        />
    </div>
);
