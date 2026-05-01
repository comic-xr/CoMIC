/**
 * @file PanelFooter.stories.jsx
 * @description Storybook stories for the PanelFooter molecule
 */

import React, { useState } from 'react';
import { PanelFooter } from './PanelFooter';

export default {
    title: 'Molecules/PanelFooter',
    component: PanelFooter,
    argTypes: {
        isUploading: {
            control: 'boolean',
        },
        isRefreshing: {
            control: 'boolean',
        },
        uploadLabel: {
            control: 'text',
        },
    },
    decorators: [
        (Story) => (
            <div style={{ maxWidth: '320px' }}>
                <Story />
            </div>
        ),
    ],
};

const Template = (args) => (
    <PanelFooter
        {...args}
        onHelp={() => console.log('Help clicked')}
        onUpload={() => console.log('Upload clicked')}
        onRefresh={() => console.log('Refresh clicked')}
    />
);

export const Default = Template.bind({});
Default.args = {
    isUploading: false,
    isRefreshing: false,
    uploadLabel: 'Upload Files',
};

export const Uploading = Template.bind({});
Uploading.args = {
    isUploading: true,
    isRefreshing: false,
    uploadLabel: 'Upload Files',
};

export const Refreshing = Template.bind({});
Refreshing.args = {
    isUploading: false,
    isRefreshing: true,
    uploadLabel: 'Upload Files',
};

export const CustomLabel = Template.bind({});
CustomLabel.args = {
    isUploading: false,
    isRefreshing: false,
    uploadLabel: 'Add Dataset',
};

export const WithoutHelp = (args) => (
    <PanelFooter
        onUpload={() => console.log('Upload clicked')}
        onRefresh={() => console.log('Refresh clicked')}
    />
);

export const WithoutRefresh = (args) => (
    <PanelFooter
        onHelp={() => console.log('Help clicked')}
        onUpload={() => console.log('Upload clicked')}
    />
);

export const Interactive = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleUpload = () => {
        setIsUploading(true);
        setTimeout(() => setIsUploading(false), 2000);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <PanelFooter
            onHelp={() => alert('Help panel would open')}
            onUpload={handleUpload}
            onRefresh={handleRefresh}
            isUploading={isUploading}
            isRefreshing={isRefreshing}
        />
    );
};

export const InPanel = () => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            height: '300px',
            background: 'var(--color-bg-secondary, #12121a)',
            borderRadius: '8px',
            overflow: 'hidden',
        }}
    >
        <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Files
            </span>
        </div>
        <div style={{ flex: 1, padding: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                File list content...
            </span>
        </div>
        <PanelFooter
            onHelp={() => {}}
            onUpload={() => {}}
            onRefresh={() => {}}
        />
    </div>
);
