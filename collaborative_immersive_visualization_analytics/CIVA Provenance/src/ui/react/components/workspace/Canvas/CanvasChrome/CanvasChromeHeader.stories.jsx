// src/ui/react/components/workspace/Canvas/CanvasChrome/CanvasChromeHeader.stories.jsx
import React from 'react';
import { CanvasChromeHeader } from './CanvasChromeHeader';
import {
    mockWorkspace,
    mockWorkspaces,
    mockViewGroup,
    mockViewGroups,
} from '../__fixtures__/canvasFixtures';

export default {
    title: 'Canvas/CanvasChromeHeader',
    component: CanvasChromeHeader,
    parameters: {
        layout: 'fullscreen',
    },
    argTypes: {
        onGoBack: { action: 'back' },
        onGoHome: { action: 'home' },
        onWorkspaceChange: { action: 'workspace change' },
        onViewGroupChange: { action: 'viewgroup change' },
        onToggleEditMode: { action: 'toggle edit' },
        onFlowDirectionChange: { action: 'flow change' },
        onToggleCoordinates: { action: 'toggle coords' },
        onToggleViewGroupBorders: { action: 'toggle vg borders' },
        onEditViewGroup: { action: 'edit viewgroup' },
        onOpenViewGroupManager: { action: 'open viewgroup manager' },
        onWindowModeChange: { action: 'window mode change' },
        onToggleFullscreen: { action: 'fullscreen' },
        flowDirection: {
            control: 'select',
            options: ['right', 'down'],
        },
        windowMode: {
            control: 'select',
            options: ['docked', 'floating', 'full'],
        },
    },
    decorators: [
        (Story) => (
            <div style={{ background: '#060a12', padding: '24px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        canGoBack: true,
        workspace: mockWorkspace,
        workspaces: mockWorkspaces,
        viewGroup: mockViewGroup,
        viewGroups: mockViewGroups,
        isViewGroupLinked: true,
        isEditMode: false,
        flowDirection: 'right',
        showCoordinates: true,
        showViewGroupBorders: false,
        windowMode: 'docked',
        isFullscreen: false,
    },
};

export const EditModeActive = {
    args: {
        ...Default.args,
        isEditMode: true,
    },
};

export const NoViewGroupSelected = {
    args: {
        ...Default.args,
        viewGroup: null,
        isViewGroupLinked: false,
    },
};
