/**
 * @file FileStateIndicator.stories.jsx
 * @description Storybook stories for FileStateIndicator component.
 */

import React from 'react';
import { FileStateIndicator, FILE_STATE_CONFIG } from './FileStateIndicator';

export default {
    title: 'Atoms/FileStateIndicator',
    component: FileStateIndicator,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
    argTypes: {
        state: {
            control: 'select',
            options: Object.keys(FILE_STATE_CONFIG),
        },
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md'],
        },
    },
};

export const Default = {
    args: {
        state: 'stored',
        size: 'sm',
    },
};

export const AllStates = {
    render: () => (
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {Object.keys(FILE_STATE_CONFIG).map((state) => (
                <div
                    key={state}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <FileStateIndicator state={state} size="md" />
                    <span style={{ fontSize: 10, color: '#888' }}>{state}</span>
                </div>
            ))}
        </div>
    ),
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {['xs', 'sm', 'md'].map((size) => (
                <div
                    key={size}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    <FileStateIndicator state="loaded" size={size} />
                    <span style={{ fontSize: 10, color: '#888' }}>{size}</span>
                </div>
            ))}
        </div>
    ),
};

export const WithTooltip = {
    args: {
        state: 'processing',
        size: 'md',
        showTooltip: true,
    },
};

export const InFileList = {
    render: () => (
        <div
            style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}
        >
            {[
                { name: 'brain_scan.nii', state: 'loaded' },
                { name: 'heart_model.vtk', state: 'stored' },
                { name: 'analysis.csv', state: 'processing' },
                { name: 'restricted.dcm', state: 'restricted' },
                { name: 'corrupted.vtp', state: 'error' },
            ].map((file) => (
                <div
                    key={file.name}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 8,
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 4,
                    }}
                >
                    <FileStateIndicator state={file.state} size="sm" />
                    <span style={{ fontSize: 12, color: '#ccc' }}>{file.name}</span>
                </div>
            ))}
        </div>
    ),
};