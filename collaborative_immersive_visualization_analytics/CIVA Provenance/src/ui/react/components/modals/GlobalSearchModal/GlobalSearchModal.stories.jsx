/**
 * @file GlobalSearchModal.stories.jsx
 * @description Storybook stories for the GlobalSearchModal component.
 * Demonstrates the global search modal with various states and configurations.
 */

import React, { useState, useEffect } from 'react';
import { GlobalSearchModal, SearchInput, SEARCH_FILTERS, SearchResultItem, SearchResults } from './index';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { Button } from '@UI/react/components/atoms/Button';

export default {
    title: 'Modals/GlobalSearchModal',
    component: GlobalSearchModal,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', minHeight: '100vh' }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// FULL MODAL
// =============================================================================

export const Default = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);

        // Register Cmd/Ctrl+K shortcut
        useEffect(() => {
            const handleKeyDown = (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    setIsOpen(true);
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }, []);

        const handleSelect = (result) => {
            console.log('Selected result:', result);
            setIsOpen(false);
        };

        return (
            <div>
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Press <kbd style={{ background: '#222', padding: '2px 8px', borderRadius: '4px', border: '1px solid #333' }}>⌘K</kbd> or click the button to open search
                </p>
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    Open Search
                </Button>
                <GlobalSearchModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSelect={handleSelect}
                />
            </div>
        );
    },
};

export const WithInitialQuery = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <GlobalSearchModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSelect={(result) => console.log('Selected:', result)}
                initialQuery="Mars"
            />
        );
    },
};

export const WithInitialFilter = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <GlobalSearchModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSelect={(result) => console.log('Selected:', result)}
                initialQuery="dataset"
                initialFilter="datasets"
            />
        );
    },
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

export const SearchInputComponent = {
    render: () => {
        const [value, setValue] = useState('');
        const [isLoading, setIsLoading] = useState(false);

        const handleChange = (newValue) => {
            setValue(newValue);
            if (newValue) {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 500);
            }
        };

        return (
            <div style={{
                width: '600px',
                background: '#1a1a24',
                border: '1px solid #2a2a3a',
                borderRadius: '12px',
                overflow: 'hidden'
            }}>
                <SearchInput
                    value={value}
                    onChange={handleChange}
                    isLoading={isLoading}
                />
            </div>
        );
    },
};

export const FilterChipsComponent = {
    render: () => {
        const [activeFilter, setActiveFilter] = useState('all');
        const counts = {
            all: 42,
            projects: 5,
            datasets: 12,
            views: 8,
            people: 15,
            annotations: 2,
        };

        return (
            <div style={{
                width: '600px',
                background: '#1a1a24',
                border: '1px solid #2a2a3a',
                borderRadius: '12px',
                overflow: 'hidden',
                padding: '12px',
            }}>
                <ChipGroup
                    chips={SEARCH_FILTERS.map(filter => ({
                        ...filter,
                        count: counts[filter.id] || 0,
                    }))}
                    activeChips={[activeFilter]}
                    onToggle={(filterId) => setActiveFilter(filterId)}
                    size="sm"
                    allowEmpty={false}
                />
            </div>
        );
    },
};

export const SearchResultItemComponent = {
    render: () => {
        const results = [
            { id: 'p1', type: 'project', name: 'Mars Exploration Dataset', description: 'NASA Mars rover imagery' },
            { id: 'd1', type: 'dataset', name: 'Training Images 2024', projectName: 'Mars Exploration' },
            { id: 'v1', type: 'view', name: 'Crater Detection', projectName: 'Mars Exploration' },
            { id: 'u1', type: 'person', name: 'Sarah Chen', description: 'Data Scientist' },
            { id: 'a1', type: 'annotation', name: 'Rock boundaries', projectName: 'Mars Exploration' },
        ];

        const [selected, setSelected] = useState(1);

        return (
            <div style={{
                width: '600px',
                background: '#1a1a24',
                border: '1px solid #2a2a3a',
                borderRadius: '12px',
                padding: '8px'
            }}>
                {results.map((result, index) => (
                    <SearchResultItem
                        key={result.id}
                        result={result}
                        query="Mars"
                        isSelected={index === selected}
                        onClick={() => setSelected(index)}
                    />
                ))}
            </div>
        );
    },
};

// =============================================================================
// STATES
// =============================================================================

export const EmptyState = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <GlobalSearchModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSelect={(result) => console.log('Selected:', result)}
            />
        );
    },
};

export const NoResultsState = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <GlobalSearchModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSelect={(result) => console.log('Selected:', result)}
                initialQuery="xyznonexistent"
            />
        );
    },
};

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

export const IntegrationExample = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);
        const [lastSelected, setLastSelected] = useState(null);

        useEffect(() => {
            const handleKeyDown = (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    setIsOpen(true);
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }, []);

        const handleSelect = (result) => {
            setLastSelected(result);
            setIsOpen(false);
        };

        return (
            <div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: '#1a1a24',
                    borderRadius: '8px',
                    marginBottom: '24px'
                }}>
                    <span style={{ color: '#888' }}>Quick actions:</span>
                    <Button
                        variant="secondary"
                        onClick={() => setIsOpen(true)}
                    >
                        🔍 Search (⌘K)
                    </Button>
                </div>

                {lastSelected && (
                    <div style={{
                        padding: '16px',
                        background: '#1a1a24',
                        borderRadius: '8px',
                        border: '1px solid #2a2a3a'
                    }}>
                        <h3 style={{ color: '#fff', marginBottom: '8px' }}>Last Selected:</h3>
                        <pre style={{ color: '#888', fontSize: '12px' }}>
                            {JSON.stringify(lastSelected, null, 2)}
                        </pre>
                    </div>
                )}

                <GlobalSearchModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSelect={handleSelect}
                />
            </div>
        );
    },
};

// =============================================================================
// KEYBOARD NAVIGATION DEMO
// =============================================================================

export const KeyboardNavigationDemo = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <div>
                <div style={{
                    padding: '16px',
                    background: '#1a1a24',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    color: '#888',
                    fontSize: '13px'
                }}>
                    <h3 style={{ color: '#fff', marginBottom: '12px' }}>Keyboard Shortcuts:</h3>
                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                        <li><kbd>↓</kbd> / <kbd>↑</kbd> - Navigate results</li>
                        <li><kbd>Enter</kbd> - Select focused result</li>
                        <li><kbd>Escape</kbd> - Close modal (or clear input)</li>
                        <li><kbd>Tab</kbd> - Move between filter chips</li>
                        <li><kbd>⌘1</kbd>-<kbd>⌘6</kbd> - Jump to filter</li>
                    </ul>
                </div>
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    Try Keyboard Navigation
                </Button>
                <GlobalSearchModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSelect={(result) => console.log('Selected:', result)}
                    initialQuery="Mars"
                />
            </div>
        );
    },
};