/**
 * @file DatasetTreeItem.stories.jsx
 * @description Storybook stories for the DatasetTreeItem component
 */

import React, { useState } from 'react';
import { DatasetTreeItem } from './DatasetTreeItem';

export default {
    title: 'FilesTab/DatasetTreeItem',
    component: DatasetTreeItem,
    decorators: [
        (Story) => (
            <div style={{ maxWidth: '320px', background: 'var(--color-bg-secondary, #12121a)', borderRadius: '8px', padding: '8px' }}>
                <Story />
            </div>
        ),
    ],
};

const mockViews = [
    { id: 'v1', name: 'Main View', color: '#3b82f6', active: true, scope: 'personal' },
    { id: 'v2', name: 'Sagittal', color: '#10b981', active: false, scope: 'shared', users: 3 },
    { id: 'v3', name: 'Coronal', color: '#f59e0b', active: false, scope: 'ephemeral' },
];

const mockDataset = {
    id: 'ds1',
    name: 'brain_scan_001.nii.gz',
    type: 'nifti',
    loadState: 'loaded',
    size: '256 MB',
    views: mockViews,
};

const Template = (args) => {
    const [expanded, setExpanded] = useState(args.expanded ?? false);

    return (
        <DatasetTreeItem
            {...args}
            expanded={expanded}
            onToggle={() => setExpanded(!expanded)}
            onViewClick={(viewId) => console.log('View clicked:', viewId)}
            onViewDoubleClick={(viewId) => console.log('View double-clicked:', viewId)}
            onCreateView={() => console.log('Create view clicked')}
        />
    );
};

export const Collapsed = Template.bind({});
Collapsed.args = {
    dataset: mockDataset,
    expanded: false,
};

export const Expanded = Template.bind({});
Expanded.args = {
    dataset: mockDataset,
    expanded: true,
};

export const NoViews = Template.bind({});
NoViews.args = {
    dataset: {
        id: 'ds2',
        name: 'new_scan.nii.gz',
        type: 'nifti',
        loadState: 'loaded',
        size: '128 MB',
        views: [],
    },
    expanded: true,
};

export const SingleView = Template.bind({});
SingleView.args = {
    dataset: {
        id: 'ds3',
        name: 'patient_data.nii.gz',
        type: 'nifti',
        loadState: 'loaded',
        size: '512 MB',
        views: [{ id: 'v1', name: 'Default View', color: '#3b82f6', active: true, scope: 'personal' }],
    },
    expanded: true,
};

export const ManyViews = Template.bind({});
ManyViews.args = {
    dataset: {
        id: 'ds4',
        name: 'multi_view_data.nii.gz',
        type: 'nifti',
        loadState: 'loaded',
        size: '1.2 GB',
        views: [
            { id: 'v1', name: 'Axial', color: '#3b82f6', active: true, scope: 'personal' },
            { id: 'v2', name: 'Sagittal', color: '#10b981', active: false, scope: 'shared' },
            { id: 'v3', name: 'Coronal', color: '#f59e0b', active: false, scope: 'workspace' },
            { id: 'v4', name: '3D Render', color: '#ef4444', active: false, scope: 'project' },
            { id: 'v5', name: 'Overlay', color: '#8b5cf6', active: false, scope: 'ephemeral' },
        ],
    },
    expanded: true,
};

export const LongDatasetName = Template.bind({});
LongDatasetName.args = {
    dataset: {
        id: 'ds5',
        name: 'very_long_dataset_name_that_should_truncate_properly_in_the_ui.nii.gz',
        type: 'nifti',
        loadState: 'loaded',
        size: '256 MB',
        views: mockViews,
    },
    expanded: true,
};

export const MultipleDatasets = () => {
    const [expandedIds, setExpandedIds] = useState(new Set(['ds1']));

    const datasets = [
        {
            id: 'ds1',
            name: 'brain_scan.nii.gz',
            type: 'nifti',
            size: '256 MB',
            views: [
                { id: 'v1', name: 'Main View', color: '#3b82f6', active: true, scope: 'personal' },
                { id: 'v2', name: 'Sagittal', color: '#10b981', active: false, scope: 'shared' },
            ],
        },
        {
            id: 'ds2',
            name: 'ct_chest.dcm',
            type: 'dicom',
            size: '512 MB',
            views: [
                { id: 'v3', name: 'Lungs', color: '#f59e0b', active: false, scope: 'workspace' },
            ],
        },
        {
            id: 'ds3',
            name: 'spine_model.vtp',
            type: 'vtp',
            size: '64 MB',
            views: [],
        },
    ];

    const toggleDataset = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {datasets.map(ds => (
                <DatasetTreeItem
                    key={ds.id}
                    dataset={ds}
                    expanded={expandedIds.has(ds.id)}
                    onToggle={() => toggleDataset(ds.id)}
                    onViewClick={(viewId) => console.log('View clicked:', viewId)}
                    onCreateView={() => console.log('Create view for:', ds.id)}
                />
            ))}
        </div>
    );
};
