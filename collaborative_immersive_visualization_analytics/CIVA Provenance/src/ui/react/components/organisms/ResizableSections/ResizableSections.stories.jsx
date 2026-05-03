// src/ui/react/components/organisms/ResizableSections/ResizableSections.stories.jsx
import React from 'react';
import {
    ResizableSections,
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates,
} from './ResizableSections';

export default {
    title: 'Organisms/ResizableSections',
    component: ResizableSections,
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{
                padding: '20px',
                background: '#0a0a0f',
                width: '300px',
                height: '500px',
            }}>
                <Story />
            </div>
        ),
    ],
};

// Helper to create mock content
const MockContent = ({ label, items = 5 }) => (
    <div style={{ padding: '8px', color: '#9ca3af' }}>
        {Array.from({ length: items }).map((_, i) => (
            <div
                key={i}
                style={{
                    padding: '8px 12px',
                    marginBottom: '4px',
                    background: '#2d2d4a',
                    borderRadius: '4px',
                    fontSize: '13px',
                }}
            >
                {label} Item {i + 1}
            </div>
        ))}
    </div>
);

export const Default = {
    render: () => (
        <ResizableSections
            sections={[
                {
                    id: 'files',
                    title: 'Files',
                    icon: 'folder',
                    defaultExpanded: true,
                    content: <MockContent label="File" items={4} />,
                },
                {
                    id: 'datasets',
                    title: 'Datasets',
                    icon: 'database',
                    defaultExpanded: true,
                    content: <MockContent label="Dataset" items={3} />,
                },
                {
                    id: 'views',
                    title: 'Views',
                    icon: 'bookmark',
                    defaultExpanded: false,
                    content: <MockContent label="View" items={2} />,
                },
            ]}
        />
    ),
};

export const AllExpanded = {
    render: () => (
        <ResizableSections
            sections={[
                {
                    id: 'section1',
                    title: 'Section 1',
                    icon: 'folder',
                    defaultExpanded: true,
                    content: <MockContent label="Item" items={3} />,
                },
                {
                    id: 'section2',
                    title: 'Section 2',
                    icon: 'file',
                    defaultExpanded: true,
                    content: <MockContent label="Item" items={3} />,
                },
                {
                    id: 'section3',
                    title: 'Section 3',
                    icon: 'star',
                    defaultExpanded: true,
                    content: <MockContent label="Item" items={3} />,
                },
            ]}
        />
    ),
};

export const AllCollapsed = {
    render: () => (
        <ResizableSections
            sections={[
                {
                    id: 'section1',
                    title: 'Section 1',
                    icon: 'folder',
                    defaultExpanded: false,
                    content: <MockContent label="Item" />,
                },
                {
                    id: 'section2',
                    title: 'Section 2',
                    icon: 'file',
                    defaultExpanded: false,
                    content: <MockContent label="Item" />,
                },
                {
                    id: 'section3',
                    title: 'Section 3',
                    icon: 'star',
                    defaultExpanded: false,
                    content: <MockContent label="Item" />,
                },
            ]}
        />
    ),
};

export const TwoSections = {
    render: () => (
        <ResizableSections
            sections={[
                {
                    id: 'top',
                    title: 'Top Section',
                    icon: 'layers',
                    defaultExpanded: true,
                    content: <MockContent label="Top" items={5} />,
                },
                {
                    id: 'bottom',
                    title: 'Bottom Section',
                    icon: 'archive',
                    defaultExpanded: true,
                    content: <MockContent label="Bottom" items={5} />,
                },
            ]}
        />
    ),
};

export const WithHeaderActions = {
    render: () => (
        <ResizableSections
            sections={[
                {
                    id: 'files',
                    title: 'Files',
                    icon: 'folder',
                    defaultExpanded: true,
                    headerActions: (
                        <button
                            onClick={(e) => { e.stopPropagation(); }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                fontSize: '12px',
                            }}
                        >
                            + Add
                        </button>
                    ),
                    content: <MockContent label="File" items={3} />,
                },
                {
                    id: 'recent',
                    title: 'Recent',
                    icon: 'clock',
                    defaultExpanded: true,
                    content: <MockContent label="Recent" items={2} />,
                },
            ]}
        />
    ),
};

export const ManySections = {
    render: () => (
        <ResizableSections
            sections={[
                { id: 's1', title: 'Files', icon: 'folder', defaultExpanded: true, content: <MockContent label="File" items={2} /> },
                { id: 's2', title: 'Datasets', icon: 'database', defaultExpanded: false, content: <MockContent label="Dataset" items={2} /> },
                { id: 's3', title: 'Views', icon: 'bookmark', defaultExpanded: false, content: <MockContent label="View" items={2} /> },
                { id: 's4', title: 'Annotations', icon: 'messageSquare', defaultExpanded: false, content: <MockContent label="Note" items={2} /> },
                { id: 's5', title: 'Cursors', icon: 'users', defaultExpanded: false, content: <MockContent label="Cursor" items={2} /> },
            ]}
        />
    ),
};

export const UsingHook = {
    render: function UsingHookStory() {
        const { states, toggleSection, resizeSection } = useSectionStates({
            files: { expanded: true, flexGrow: 1 },
            datasets: { expanded: true, flexGrow: 1 },
            views: { expanded: false, flexGrow: 1 },
        });

        return (
            <ResizableSectionsContainer
                sectionStates={states}
                onSectionToggle={toggleSection}
                onSectionResize={resizeSection}
            >
                <ResizableSection id="files" label="Files" icon="folder">
                    <MockContent label="File" items={3} />
                </ResizableSection>
                <ResizableSection id="datasets" label="Datasets" icon="database">
                    <MockContent label="Dataset" items={3} />
                </ResizableSection>
                <ResizableSection id="views" label="Views" icon="bookmark">
                    <MockContent label="View" items={2} />
                </ResizableSection>
            </ResizableSectionsContainer>
        );
    },
};

export const SingleSection = {
    render: () => (
        <ResizableSections
            sections={[
                {
                    id: 'only',
                    title: 'Only Section',
                    icon: 'box',
                    defaultExpanded: true,
                    content: (
                        <div style={{ padding: '16px', color: '#9ca3af' }}>
                            This section fills all available space when it's the only one expanded.
                        </div>
                    ),
                },
            ]}
        />
    ),
};

export const LeftPanelExample = {
    render: () => (
        <div style={{
            height: '100%',
            background: '#1a1a2e',
            borderRadius: '8px',
            overflow: 'hidden',
        }}>
            <ResizableSections
                sections={[
                    {
                        id: 'files',
                        title: 'Files',
                        icon: 'folder',
                        defaultExpanded: true,
                        content: (
                            <div style={{ padding: '8px' }}>
                                {['data.csv', 'config.json', 'readme.md'].map((f) => (
                                    <div
                                        key={f}
                                        style={{
                                            padding: '6px 10px',
                                            color: '#e5e7eb',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        📄 {f}
                                    </div>
                                ))}
                            </div>
                        ),
                    },
                    {
                        id: 'datasets',
                        title: 'Datasets',
                        icon: 'database',
                        defaultExpanded: true,
                        content: (
                            <div style={{ padding: '8px' }}>
                                {['Sales Data', 'User Metrics'].map((d) => (
                                    <div
                                        key={d}
                                        style={{
                                            padding: '6px 10px',
                                            color: '#e5e7eb',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        📊 {d}
                                    </div>
                                ))}
                            </div>
                        ),
                    },
                    {
                        id: 'views',
                        title: 'Views',
                        icon: 'bookmark',
                        defaultExpanded: false,
                        content: (
                            <div style={{ padding: '8px', color: '#9ca3af' }}>
                                No saved views
                            </div>
                        ),
                    },
                ]}
            />
        </div>
    ),
};

export const ResizeInstructions = {
    render: () => (
        <div>
            <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: '#1e3a5f',
                borderRadius: '8px',
                color: '#93c5fd',
                fontSize: '12px',
            }}>
                💡 Drag the divider between expanded sections to resize them
            </div>
            <ResizableSections
                sections={[
                    {
                        id: 'top',
                        title: 'Drag below to resize',
                        icon: 'arrowDown',
                        defaultExpanded: true,
                        content: <MockContent label="Top" items={4} />,
                    },
                    {
                        id: 'bottom',
                        title: 'Bottom Section',
                        icon: 'arrowUp',
                        defaultExpanded: true,
                        content: <MockContent label="Bottom" items={4} />,
                    },
                ]}
            />
        </div>
    ),
};
