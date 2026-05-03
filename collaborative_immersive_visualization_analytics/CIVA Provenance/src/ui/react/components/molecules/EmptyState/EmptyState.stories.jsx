// src/ui/react/components/molecules/EmptyState/EmptyState.stories.jsx
import React from 'react';
import { EmptyState } from './EmptyState';

export default {
    title: 'Molecules/EmptyState',
    component: EmptyState,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '400px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        icon: 'search',
        title: 'No results found',
        description: 'Try adjusting your search criteria',
    },
};

export const WithAction = {
    args: {
        icon: 'folderPlus',
        title: 'No projects yet',
        description: 'Create your first project to get started',
        action: {
            label: 'Create Project',
            onClick: () => {},
        },
    },
};

export const NoDescription = {
    args: {
        icon: 'messageSquare',
        title: 'No messages',
    },
};

export const NoIcon = {
    args: {
        title: 'Nothing here',
        description: 'Add some items to get started',
    },
};

export const Small = {
    args: {
        icon: 'file',
        title: 'No files',
        size: 'sm',
    },
};

export const Large = {
    args: {
        icon: 'database',
        title: 'No datasets loaded',
        description: 'Upload a dataset or connect to a data source to begin your analysis.',
        size: 'lg',
        action: {
            label: 'Upload Dataset',
            onClick: () => {},
        },
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <EmptyState
                icon="inbox"
                title="Small"
                size="sm"
            />
            <EmptyState
                icon="inbox"
                title="Medium"
                description="Default size"
                size="md"
            />
            <EmptyState
                icon="inbox"
                title="Large"
                description="For prominent empty states"
                size="lg"
            />
        </div>
    ),
};

export const SearchResults = {
    args: {
        icon: 'search',
        title: 'No matching results',
        description: 'Try different keywords or remove some filters',
        action: {
            label: 'Clear Filters',
            onClick: () => {},
            variant: 'secondary',
        },
    },
};

export const EmptyInbox = {
    args: {
        icon: 'inbox',
        title: "You're all caught up!",
        description: 'No new notifications',
    },
};

export const NoConnection = {
    args: {
        icon: 'wifiOff',
        title: 'No connection',
        description: 'Check your internet connection and try again',
        action: {
            label: 'Retry',
            onClick: () => {},
        },
    },
};
