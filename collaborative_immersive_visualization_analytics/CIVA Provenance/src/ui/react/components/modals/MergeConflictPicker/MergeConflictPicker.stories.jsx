/**
 * @file MergeConflictPicker.stories.jsx
 * @description Storybook stories for MergeConflictPicker component.
 */

import React, { useState } from 'react';
import MergeConflictPicker from './MergeConflictPicker';
import ViewCard from './ViewCard';

export default {
    title: 'Modals/MergeConflictPicker',
    component: MergeConflictPicker,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'Modal for choosing which view to keep when merging canvas cells that contain multiple views.',
            },
        },
    },
    argTypes: {
        isOpen: {
            control: 'boolean',
            description: 'Whether modal is visible',
        },
        onClose: {
            action: 'closed',
            description: 'Close/cancel handler',
        },
        onMerge: {
            action: 'merged',
            description: 'Called with merge decision',
        },
    },
};

// Sample view data
const SAMPLE_VIEWS = [
    {
        id: 'view-1',
        name: 'Brain Volume',
        datasetName: 'MRI Dataset',
        type: 'Volume',
        color: '#3b82f6',
        thumbnail: null,
    },
    {
        id: 'view-2',
        name: 'Cortex Surface',
        datasetName: 'Segmentation',
        type: 'Surface',
        color: '#10b981',
        thumbnail: null,
    },
    {
        id: 'view-3',
        name: 'Fiber Tracts',
        datasetName: 'DTI Analysis',
        type: 'Streamlines',
        color: '#f59e0b',
        thumbnail: null,
    },
];

const TWO_VIEWS = SAMPLE_VIEWS.slice(0, 2);

const FOUR_VIEWS = [
    ...SAMPLE_VIEWS,
    {
        id: 'view-4',
        name: 'Lesion Overlay',
        datasetName: 'Clinical Data',
        type: 'Overlay',
        color: '#ef4444',
        thumbnail: null,
    },
];

const MANY_VIEWS = [
    ...FOUR_VIEWS,
    {
        id: 'view-5',
        name: 'Atlas Regions',
        datasetName: 'AAL Atlas',
        type: 'Labels',
        color: '#8b5cf6',
        thumbnail: null,
    },
    {
        id: 'view-6',
        name: 'fMRI Activation',
        datasetName: 'Task Study',
        type: 'Statistical',
        color: '#ec4899',
        thumbnail: null,
    },
];

// Interactive wrapper for modal stories
const ModalWrapper = ({ children, ...props }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [result, setResult] = useState(null);

    const handleMerge = (mergeResult) => {
        setResult(mergeResult);
        setIsOpen(false);
    };

    return (
        <div>
            <button
                onClick={() => {
                    setIsOpen(true);
                    setResult(null);
                }}
                style={{
                    padding: '10px 20px',
                    background: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                }}
            >
                Open Merge Conflict Picker
            </button>
            {result && (
                <div style={{ marginTop: '16px', fontSize: '12px', color: '#888' }}>
                    <strong>Result:</strong>
                    <pre style={{ marginTop: '8px', padding: '8px', background: '#1a1a2e', borderRadius: '4px' }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
            {React.cloneElement(children, {
                ...props,
                isOpen,
                onClose: () => setIsOpen(false),
                onMerge: handleMerge,
            })}
        </div>
    );
};

/**
 * Default state with 3 views.
 */
export const Default = {
    render: (args) => (
        <ModalWrapper>
            <MergeConflictPicker {...args} />
        </ModalWrapper>
    ),
    args: {
        views: SAMPLE_VIEWS,
    },
};

/**
 * Two views - simpler layout.
 */
export const TwoViews = {
    render: (args) => (
        <ModalWrapper>
            <MergeConflictPicker {...args} />
        </ModalWrapper>
    ),
    args: {
        views: TWO_VIEWS,
    },
};

/**
 * Four views - 2x2 grid.
 */
export const FourViews = {
    render: (args) => (
        <ModalWrapper>
            <MergeConflictPicker {...args} />
        </ModalWrapper>
    ),
    args: {
        views: FOUR_VIEWS,
    },
};

/**
 * Many views - scrollable grid.
 */
export const ManyViews = {
    render: (args) => (
        <ModalWrapper>
            <MergeConflictPicker {...args} />
        </ModalWrapper>
    ),
    args: {
        views: MANY_VIEWS,
    },
};

/**
 * Views with long names.
 */
export const LongNames = {
    render: (args) => (
        <ModalWrapper>
            <MergeConflictPicker {...args} />
        </ModalWrapper>
    ),
    args: {
        views: [
            {
                id: 'view-1',
                name: 'Very Long View Name That Should Truncate',
                datasetName: 'Extremely Long Dataset Name For Testing Purposes',
                type: 'Volume',
                color: '#3b82f6',
                thumbnail: null,
            },
            {
                id: 'view-2',
                name: 'Another Extremely Long View Name Here',
                datasetName: 'Short DS',
                type: 'Surface',
                color: '#10b981',
                thumbnail: null,
            },
            {
                id: 'view-3',
                name: 'Third View With Long Name',
                datasetName: 'Medium Length Dataset Name',
                type: 'Streamlines',
                color: '#f59e0b',
                thumbnail: null,
            },
        ],
    },
};

// =============================================================================
// VIEW CARD STORIES
// =============================================================================

export const ViewCardDefault = {
    render: () => {
        const [selected, setSelected] = useState(null);

        return (
            <div style={{ display: 'flex', gap: '12px', padding: '20px', background: '#1a1a2e' }}>
                {SAMPLE_VIEWS.map((view) => (
                    <div key={view.id} style={{ width: '150px' }}>
                        <ViewCard
                            view={view}
                            isSelected={selected === view.id}
                            onClick={() => setSelected(view.id)}
                        />
                    </div>
                ))}
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Individual view cards showing selection behavior.',
            },
        },
    },
};

export const ViewCardWithThumbnails = {
    render: () => {
        const [selected, setSelected] = useState('view-1');

        const viewsWithThumbnails = SAMPLE_VIEWS.map((view, index) => ({
            ...view,
            thumbnail: `https://picsum.photos/200/125?random=${index}`,
        }));

        return (
            <div style={{ display: 'flex', gap: '12px', padding: '20px', background: '#1a1a2e' }}>
                {viewsWithThumbnails.map((view) => (
                    <div key={view.id} style={{ width: '150px' }}>
                        <ViewCard
                            view={view}
                            isSelected={selected === view.id}
                            onClick={() => setSelected(view.id)}
                        />
                    </div>
                ))}
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'View cards with thumbnail images.',
            },
        },
    },
};

export const ViewCardTypes = {
    render: () => {
        const viewTypes = [
            { id: '1', name: 'Volume View', datasetName: 'MRI', type: 'Volume', color: '#3b82f6' },
            { id: '2', name: 'Surface View', datasetName: 'Mesh', type: 'Surface', color: '#10b981' },
            { id: '3', name: 'Overlay View', datasetName: 'Stats', type: 'Overlay', color: '#f59e0b' },
            { id: '4', name: 'Labels View', datasetName: 'Atlas', type: 'Labels', color: '#8b5cf6' },
        ];

        return (
            <div style={{ display: 'flex', gap: '12px', padding: '20px', background: '#1a1a2e', flexWrap: 'wrap' }}>
                {viewTypes.map((view) => (
                    <div key={view.id} style={{ width: '140px' }}>
                        <ViewCard
                            view={view}
                            isSelected={false}
                            onClick={() => { }}
                        />
                    </div>
                ))}
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Different view types with their color accents.',
            },
        },
    },
};

/**
 * Keyboard navigation demo.
 */
export const KeyboardNavigation = {
    render: (args) => (
        <div>
            <ModalWrapper>
                <MergeConflictPicker {...args} />
            </ModalWrapper>
            <p style={{ marginTop: '24px', fontSize: '12px', color: '#666', maxWidth: '400px' }}>
                <strong>Keyboard Navigation:</strong><br />
                Use Arrow keys to move between view cards.<br />
                Press Space or Enter to select a view.<br />
                Tab to move between sections.
            </p>
        </div>
    ),
    args: {
        views: FOUR_VIEWS,
    },
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates keyboard navigation between view cards using arrow keys.',
            },
        },
    },
};