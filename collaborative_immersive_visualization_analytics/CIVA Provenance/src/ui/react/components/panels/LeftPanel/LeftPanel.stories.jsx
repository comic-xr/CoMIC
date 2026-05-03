// src/ui/react/components/panels/LeftPanel/LeftPanel.stories.jsx
// Storybook stories for the LeftPanel and its tabs

import React from 'react';
import { LeftPanel } from './index';
import { FilesPanelContent } from './tabs/FilesTab';
import { DatasetsPanelContent } from './tabs/DatasetsTab';
import { InstanceToolsPanelContent } from './tabs/InstanceToolsTab';
import { LayoutPanelContent } from './tabs/LayoutTab';
import { AnnotationsPanelContent } from './tabs/AnnotationsTab';
import { CursorsPanelContent } from './tabs/CursorsTab';
import { BookmarksFiltersPanelContent } from './tabs/BookmarksFiltersTab';
import './LeftPanel.scss';

// Import mock data for Storybook stories
import {
    MOCK_FILES_UI,
    MOCK_FOLDERS_TREE,
    MOCK_STARRED_IDS,
    MOCK_DATASETS_WITH_VIEWS,
} from '@UI/react/__mocks__';

export default {
    title: 'Panels/LeftPanel',
    component: LeftPanel,
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'dark',
            values: [
                { name: 'dark', value: '#1e1e1e' },
            ],
        },
    },
    decorators: [
        (Story) => (
            <div style={{
                height: '100vh',
                display: 'flex',
                background: '#1e1e1e',
            }}>
                <div style={{ width: '320px', height: '100%' }}>
                    <Story />
                </div>
            </div>
        ),
    ],
};

// =============================================================================
// FULL PANEL STORIES
// =============================================================================

export const Default = {
    args: {
        workspaceId: 'ws-1',
    },
};

export const Collapsed = {
    args: {
        workspaceId: 'ws-1',
        initialCollapsed: true,
    },
};

// =============================================================================
// INDIVIDUAL TAB STORIES
// =============================================================================

const TabDecorator = (Story) => (
    <div style={{
        height: '100vh',
        width: '300px',
        background: 'var(--color-bg-secondary, #252526)',
        overflow: 'hidden',
    }}>
        <Story />
    </div>
);

export const FilesTab = {
    render: () => (
        <FilesPanelContent
            workspaceId="ws-1"
            mockFiles={MOCK_FILES_UI}
            mockFolders={MOCK_FOLDERS_TREE}
            mockStarredIds={MOCK_STARRED_IDS}
            mockIsLoading={false}
            mockError={null}
        />
    ),
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Files tab showing project files with starred, recent, and all files sections. Supports list and grid view modes.',
            },
        },
    },
};

export const FilesTabLoading = {
    render: () => (
        <FilesPanelContent
            workspaceId="ws-1"
            mockFiles={[]}
            mockIsLoading={true}
        />
    ),
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Files tab in loading state.',
            },
        },
    },
};

export const FilesTabEmpty = {
    render: () => (
        <FilesPanelContent
            workspaceId="ws-1"
            mockFiles={[]}
            mockFolders={[]}
            mockIsLoading={false}
        />
    ),
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Files tab with no files uploaded.',
            },
        },
    },
};

export const FilesTabError = {
    render: () => (
        <FilesPanelContent
            workspaceId="ws-1"
            mockFiles={[]}
            mockIsLoading={false}
            mockError="Failed to connect to server"
        />
    ),
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Files tab showing an error state.',
            },
        },
    },
};

export const DatasetsTab = {
    render: () => <DatasetsPanelContent workspaceId="ws-1" />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Datasets tab showing loaded datasets with active, inactive, and shared view filtering.',
            },
        },
    },
};

export const InstanceToolsTab = {
    render: () => <InstanceToolsPanelContent workspaceId="ws-1" />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Instance Tools tab with navigation, visualization, widget, and annotation tools for the focused instance.',
            },
        },
    },
};

export const LayoutTab = {
    render: () => <LayoutPanelContent workspaceId="ws-1" />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Layout tab with infinite canvas navigator, view mode controls, arrangement grid, and workspace member visibility.',
            },
        },
    },
};

export const AnnotationsTab = {
    render: () => <AnnotationsPanelContent workspaceId="ws-1" />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Annotations tab showing dataset and workspace annotations with type filtering and visibility controls.',
            },
        },
    },
};

export const CursorsTab = {
    render: () => <CursorsPanelContent workspaceId="ws-1" />,
    decorators: [TabDecorator],
    parameters: {
        docs: {
            description: {
                story: 'Cursors tab for configuring cursor visibility, color, and default behavior settings.',
            },
        },
    },
};

// NEED TO UPDATE THESE TAB STORIES AFTER MERGING THE NEW TAB

// export const SavedFiltersTab = {
//     render: () => <SavedFiltersPanelContent workspaceId="ws-1" />,
//     decorators: [TabDecorator],
//     parameters: {
//         docs: {
//             description: {
//                 story: 'Saved Filters tab showing filter presets with starring, sharing, and quick apply functionality.',
//             },
//         },
//     },
// };

// export const BookmarksTab = {
//     render: () => <BookmarksPanelContent workspaceId="ws-1" />,
//     decorators: [TabDecorator],
//     parameters: {
//         docs: {
//             description: {
//                 story: 'Bookmarks tab showing saved view bookmarks with thumbnails, tags, and navigation.',
//             },
//         },
//     },
// };