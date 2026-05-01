// src/ui/react/components/workspace/Canvas/CanvasChrome/CanvasChrome.stories.jsx
import React, { useState } from 'react';
import { CanvasChrome } from './CanvasChrome';
import { CanvasInfoFooter } from '../CanvasInfoFooter/CanvasInfoFooter';
import {
    mockWorkspace,
    mockWorkspaces,
    mockViewGroup,
    mockViewGroups,
    mockActiveView,
    mockToolSections,
    mockTools,
} from '../__fixtures__/canvasFixtures';

export default {
    title: 'Canvas/CanvasChrome',
    component: CanvasChrome,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story) => (
            <div style={{ background: '#020406', padding: '24px', minHeight: '80vh' }}>
                <Story />
            </div>
        ),
    ],
};

function CanvasChromeStory(args) {
    const [canvasSize, setCanvasSize] = useState({ cols: 10, rows: 10 });
    const [viewportSize, setViewportSize] = useState({ cols: 3, rows: 3 });

    return (
        <CanvasChrome
            {...args}
            infoBar={(
                <CanvasInfoFooter
                    canvasSize={canvasSize}
                    viewportSize={viewportSize}
                    cellSize={{ width: 300, height: 250 }}
                    collaboratorCount={3}
                    syncStatus="synced"
                    onCanvasSizeChange={setCanvasSize}
                    onViewportSizeChange={setViewportSize}
                />
            )}
            footer2={(
                <div style={{ height: 50, background: '#0c1220', borderTop: '1px solid rgba(96,165,250,0.12)' }} />
            )}
        >
            <div style={{ flex: 1, background: '#030303', borderRadius: 8 }} />
        </CanvasChrome>
    );
}

export const Default = {
    render: (args) => <CanvasChromeStory {...args} />,
    args: {
        headerProps: {
            canGoBack: true,
            workspace: mockWorkspace,
            workspaces: mockWorkspaces,
            viewGroup: mockViewGroup,
            viewGroups: mockViewGroups,
            isViewGroupLinked: true,
            flowDirection: 'right',
            windowMode: 'docked',
        },
        editBarProps: {
            activeTool: 'select',
        },
        footer1Props: {
            canUndo: true,
            canRedo: false,
            activeView: mockActiveView,
            tools: mockTools,
            toolSections: mockToolSections,
        },
        isEditMode: true,
    },
};
