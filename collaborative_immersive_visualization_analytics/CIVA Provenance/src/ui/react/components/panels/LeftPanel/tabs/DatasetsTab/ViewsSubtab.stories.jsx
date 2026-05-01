import { useState } from 'react';
import { ViewsSubtab } from './ViewsSubtab';

export default {
    title: 'Panels/LeftPanel/ViewsSubtab',
    component: ViewsSubtab,
    parameters: {
        layout: 'padded',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{
                width: '300px',
                height: '500px',
                background: '#1a1a1a',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                <Story />
            </div>
        ),
    ],
};

// Sample data
const sampleDatasets = [
    { id: 'd1', name: 'Sales Data', color: '#60a5fa' },
    { id: 'd2', name: 'Customer Analytics', color: '#34d399' },
    { id: 'd3', name: 'Product Inventory', color: '#fb7185' },
];

const sampleViews = [
    {
        id: 'v1',
        name: 'Q4 Revenue',
        datasetId: 'd1',
        color: '#60a5fa',
        position: { row: 0, col: 0 },
        isActive: true,
        isWorkspace: true,
        linkedCount: 2,
    },
    {
        id: 'v2',
        name: 'Monthly Sales',
        datasetId: 'd1',
        color: '#60a5fa',
        position: { row: 0, col: 1 },
        isActive: false,
        isWorkspace: true,
    },
    {
        id: 'v3',
        name: 'Customer Segments',
        datasetId: 'd2',
        color: '#34d399',
        position: { row: 1, col: 0 },
        isActive: false,
        isShared: true,
    },
    {
        id: 'v4',
        name: 'Churn Analysis',
        datasetId: 'd2',
        color: '#34d399',
        position: { row: 1, col: 1 },
        isActive: false,
        filterCount: 3,
    },
    {
        id: 'v5',
        name: 'Stock Levels',
        datasetId: 'd3',
        color: '#fb7185',
        position: { row: 2, col: 0 },
        isActive: false,
        isLocked: true,
    },
];

// Default
export const Default = {
    args: {
        views: sampleViews,
        datasets: sampleDatasets,
    },
};

// With selected view (shows dataset context)
export const WithSelectedView = {
    args: {
        views: sampleViews,
        datasets: sampleDatasets,
        selectedViewId: 'v1',
    },
};

// Empty state
export const Empty = {
    args: {
        views: [],
        datasets: sampleDatasets,
    },
};

// Single view
export const SingleView = {
    args: {
        views: [sampleViews[0]],
        datasets: sampleDatasets,
    },
};

// Interactive
export const Interactive = () => {
    const [views, setViews] = useState(sampleViews);
    const [selectedId, setSelectedId] = useState(null);

    return (
        <ViewsSubtab
            views={views}
            datasets={sampleDatasets}
            selectedViewId={selectedId}
            onSelectView={setSelectedId}
            onCloseView={(id) => {
                setViews(views.filter(v => v.id !== id));
                if (selectedId === id) setSelectedId(null);
            }}
            onRenameView={(id, name) => {
                setViews(views.map(v => v.id === id ? { ...v, name } : v));
            }}
            onNavigate={(pos) => console.log('Navigate to:', pos)}
            onCloseAllInDataset={(datasetId) => {
                setViews(views.filter(v => v.datasetId !== datasetId));
                setSelectedId(null);
            }}
            onSpawnView={(datasetId) => console.log('Spawn view for dataset:', datasetId)}
            onGoToDataset={(datasetId) => console.log('Go to dataset:', datasetId)}
            onSaveView={(id) => console.log('Save view:', id)}
            onShareView={(id) => console.log('Share view:', id)}
            onSpawnLink={(id) => console.log('Spawn link:', id)}
            onSizeChange={(id, size) => console.log('Size change:', id, size)}
            onLinkPropertyChange={(id, prop, value) => console.log('Link property:', id, prop, value)}
        />
    );
};