/**
 * @file DuplicationDialog.stories.jsx
 * @description Storybook stories for DuplicationDialog component
 */

import React from 'react';
import { DuplicationDialog } from './DuplicationDialog';

export default {
    title: 'Modals/DuplicationDialog',
    component: DuplicationDialog,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
## DuplicationDialog

Dialog shown when duplicating a ViewGroup that has active links.

### Features
- Shows active link badges for the source ViewGroup
- Three link handling options with radio buttons
- "Link to original" recommended and selected by default
- Warning message when "Link to original" is selected
- Handles ViewGroups with no links gracefully

### Link Options
1. **Keep individual links** - Copy inherits same link targets
2. **Link to original** (Recommended) - New group syncs with original ViewGroup
3. **No links** - Start fresh, configure manually
                `,
            },
        },
    },
    argTypes: {
        isOpen: {
            control: 'boolean',
            description: 'Whether the dialog is visible',
        },
        onClose: {
            action: 'closed',
            description: 'Called when dialog is closed',
        },
        onConfirm: {
            action: 'confirmed',
            description: 'Called with selected option when Duplicate is clicked',
        },
    },
};

// Mock data
const mockViewGroup = {
    id: 'vg-1',
    name: 'MRI Slices',
    color: '#14b8a6',
};

const mockLinkStats = {
    camera: { count: 2, mode: 'sync', linkedViews: ['view-2', 'view-3'] },
    filters: { count: 1, mode: 'follow', linkedViews: ['view-2'] },
    colorMaps: { count: 0 },
    widgets: { count: 0 },
    cursors: { count: 3, mode: 'sync', linkedViews: ['view-2', 'view-3', 'view-4'] },
    annotations: { count: 0 },
};

const mockLinkStatsNoLinks = {
    camera: { count: 0 },
    filters: { count: 0 },
    colorMaps: { count: 0 },
    widgets: { count: 0 },
    cursors: { count: 0 },
    annotations: { count: 0 },
};

const mockLinkStatsMany = {
    camera: { count: 4, mode: 'sync', linkedViews: ['v1', 'v2', 'v3', 'v4'] },
    filters: { count: 2, mode: 'follow', linkedViews: ['v1', 'v2'] },
    colorMaps: { count: 3, mode: 'broadcast', linkedViews: ['v1', 'v2', 'v3'] },
    widgets: { count: 1, mode: 'sync', linkedViews: ['v1'] },
    cursors: { count: 5, mode: 'sync', linkedViews: ['v1', 'v2', 'v3', 'v4', 'v5'] },
    annotations: { count: 2, mode: 'sync', linkedViews: ['v1', 'v2'] },
};

/**
 * Default state with some active links
 */
export const Default = {
    args: {
        isOpen: true,
        viewGroup: mockViewGroup,
        linkStats: mockLinkStats,
    },
};

/**
 * ViewGroup with no active links
 */
export const NoLinks = {
    args: {
        isOpen: true,
        viewGroup: {
            ...mockViewGroup,
            name: 'Isolated View',
        },
        linkStats: mockLinkStatsNoLinks,
    },
};

/**
 * ViewGroup with many active links
 */
export const ManyLinks = {
    args: {
        isOpen: true,
        viewGroup: {
            ...mockViewGroup,
            name: 'Heavily Linked',
        },
        linkStats: mockLinkStatsMany,
    },
};

/**
 * Long ViewGroup name
 */
export const LongName = {
    args: {
        isOpen: true,
        viewGroup: {
            id: 'vg-long',
            name: 'Tumor Comparison Analysis with Multi-Modal Imaging Data',
            color: '#a855f7',
        },
        linkStats: mockLinkStats,
    },
};

/**
 * Interactive demo showing the confirm callback
 */
export const Interactive = {
    args: {
        isOpen: true,
        viewGroup: mockViewGroup,
        linkStats: mockLinkStats,
    },
    render: (args) => {
        const [isOpen, setIsOpen] = React.useState(true);
        const [lastOption, setLastOption] = React.useState(null);

        const handleConfirm = (option) => {
            setLastOption(option);
            setIsOpen(false);
            console.log('Selected option:', option);
        };

        return (
            <div>
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                    }}
                >
                    Open Dialog
                </button>

                {lastOption && (
                    <p style={{ marginTop: '16px', color: '#666' }}>
                        Last selected: <strong>{lastOption}</strong>
                    </p>
                )}

                <DuplicationDialog
                    {...args}
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onConfirm={handleConfirm}
                />
            </div>
        );
    },
};
