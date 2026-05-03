import React, { useState, useRef } from 'react';
import { TagsDropdown } from './TagsDropdown';

export default {
    title: 'Molecules/TagsDropdown',
    component: TagsDropdown,
    parameters: {
        layout: 'padded',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '24px', background: '#0f0f0f', borderRadius: '8px', minWidth: '320px' }}>
                <Story />
            </div>
        ),
    ],
};

// Shared button style for consistency
const triggerButtonStyle = {
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    color: '#e5e7eb',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontFamily: 'inherit',
};

const triggerButtonActiveStyle = {
    ...triggerButtonStyle,
    background: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
};

// Sample data
const SAMPLE_TAGS = [
    { id: 'pre-op', name: 'Pre-op', categoryId: 'phase' },
    { id: 'post-op', name: 'Post-op', categoryId: 'phase' },
    { id: 'baseline', name: 'Baseline', categoryId: 'phase' },
    { id: 'pending', name: 'Pending Review', categoryId: 'status' },
    { id: 'approved', name: 'Approved', categoryId: 'status' },
    { id: 'rejected', name: 'Rejected', categoryId: 'status' },
    { id: 'control', name: 'Control', categoryId: 'cohort' },
    { id: 'treatment', name: 'Treatment', categoryId: 'cohort' },
    { id: 'placebo', name: 'Placebo', categoryId: 'cohort' },
];

const SAMPLE_TAGS_BY_CATEGORY = {
    phase: {
        id: 'phase',
        label: 'Study Phase',
        color: '#8b5cf6',
        order: 1,
        tags: [
            { id: 'pre-op', name: 'Pre-op', categoryId: 'phase', count: 12 },
            { id: 'post-op', name: 'Post-op', categoryId: 'phase', count: 8 },
            { id: 'baseline', name: 'Baseline', categoryId: 'phase', count: 15 },
        ],
    },
    status: {
        id: 'status',
        label: 'Status',
        color: '#f59e0b',
        order: 2,
        tags: [
            { id: 'pending', name: 'Pending Review', categoryId: 'status', count: 5 },
            { id: 'approved', name: 'Approved', categoryId: 'status', count: 20 },
            { id: 'rejected', name: 'Rejected', categoryId: 'status', count: 2 },
        ],
    },
    cohort: {
        id: 'cohort',
        label: 'Cohort',
        color: '#10b981',
        order: 3,
        tags: [
            { id: 'control', name: 'Control', categoryId: 'cohort', count: 10 },
            { id: 'treatment', name: 'Treatment', categoryId: 'cohort', count: 14 },
            { id: 'placebo', name: 'Placebo', categoryId: 'cohort', count: 6 },
        ],
    },
};

// Interactive example with trigger button
export const Default = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTags, setSelectedTags] = useState(['pre-op', 'approved']);
    const triggerRef = useRef(null);

    const handleToggle = (tagId) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(t => t !== tagId)
                : [...prev, tagId]
        );
    };

    return (
        <div style={{ minHeight: '400px' }}>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                style={isOpen ? triggerButtonActiveStyle : triggerButtonStyle}
            >
                <span>Tags</span>
                {selectedTags.length > 0 && (
                    <span style={{
                        background: 'rgba(168, 85, 247, 0.9)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: 600,
                    }}>
                        {selectedTags.length}
                    </span>
                )}
            </button>

            <TagsDropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                triggerRef={triggerRef}
                tags={SAMPLE_TAGS}
                tagsByCategory={SAMPLE_TAGS_BY_CATEGORY}
                selectedTags={selectedTags}
                onToggleTag={handleToggle}
            />
        </div>
    );
};

// With tag creation enabled
export const WithCreation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTags, setSelectedTags] = useState([]);
    const [tags, setTags] = useState(SAMPLE_TAGS);
    const [tagsByCategory, setTagsByCategory] = useState(SAMPLE_TAGS_BY_CATEGORY);
    const triggerRef = useRef(null);

    const handleToggle = (tagId) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(t => t !== tagId)
                : [...prev, tagId]
        );
    };

    const handleCreateTag = ({ name, categoryId }) => {
        const newTag = {
            id: `custom-${Date.now()}`,
            name,
            categoryId,
            count: 0,
        };

        setTags(prev => [...prev, newTag]);
        setTagsByCategory(prev => ({
            ...prev,
            [categoryId]: {
                ...prev[categoryId],
                tags: [...prev[categoryId].tags, newTag],
            },
        }));

        // Auto-select the new tag
        setSelectedTags(prev => [...prev, newTag.id]);
    };

    return (
        <div style={{ minHeight: '450px' }}>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                style={isOpen ? triggerButtonActiveStyle : triggerButtonStyle}
            >
                Tags (Creation Enabled)
            </button>

            <TagsDropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                triggerRef={triggerRef}
                tags={tags}
                tagsByCategory={tagsByCategory}
                selectedTags={selectedTags}
                onToggleTag={handleToggle}
                allowCreation={true}
                onCreateTag={handleCreateTag}
            />
        </div>
    );
};

// Open by default to show dropdown
export const OpenByDefault = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedTags, setSelectedTags] = useState([]);
    const triggerRef = useRef(null);

    const handleToggle = (tagId) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(t => t !== tagId)
                : [...prev, tagId]
        );
    };

    return (
        <div style={{ minHeight: '400px' }}>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                style={isOpen ? triggerButtonActiveStyle : triggerButtonStyle}
            >
                Filter by Tags
            </button>

            <TagsDropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                triggerRef={triggerRef}
                tags={SAMPLE_TAGS}
                tagsByCategory={SAMPLE_TAGS_BY_CATEGORY}
                selectedTags={selectedTags}
                onToggleTag={handleToggle}
            />
        </div>
    );
};

// Many tags selected
export const ManySelected = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedTags, setSelectedTags] = useState([
        'pre-op', 'post-op', 'pending', 'approved', 'control', 'treatment'
    ]);
    const triggerRef = useRef(null);

    const handleToggle = (tagId) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(t => t !== tagId)
                : [...prev, tagId]
        );
    };

    return (
        <div style={{ minHeight: '400px' }}>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    ...triggerButtonActiveStyle,
                    background: 'rgba(168, 85, 247, 0.15)',
                    borderColor: 'rgba(168, 85, 247, 0.4)',
                }}
            >
                <span>6 Tags Selected</span>
                <span style={{
                    background: 'rgba(168, 85, 247, 0.9)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 600,
                }}>
                    6
                </span>
            </button>

            <TagsDropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                triggerRef={triggerRef}
                tags={SAMPLE_TAGS}
                tagsByCategory={SAMPLE_TAGS_BY_CATEGORY}
                selectedTags={selectedTags}
                onToggleTag={handleToggle}
            />
        </div>
    );
};
