// src/ui/react/components/workspace/Canvas/CanvasWorkspace/CanvasWorkspace.stories.jsx
import React from 'react';
import { CanvasWorkspace } from './CanvasWorkspace';

export default {
    title: 'Canvas/CanvasWorkspace',
    component: CanvasWorkspace,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story) => (
            <div style={{ height: '100vh', background: '#020406' }}>
                <Story />
            </div>
        ),
    ],
};

export const IntegratedLayout = {
    args: {
        userId: 'storybook-user',
        projectId: 'storybook-project',
        leftPanelContent: <div style={{ padding: 16, color: '#fff' }}>Files panel</div>,
        rightPanelContent: <div style={{ padding: 16, color: '#fff' }}>Properties panel</div>,
    },
};
