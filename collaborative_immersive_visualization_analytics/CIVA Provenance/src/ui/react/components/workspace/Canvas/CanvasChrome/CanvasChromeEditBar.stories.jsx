// src/ui/react/components/workspace/Canvas/CanvasChrome/CanvasChromeEditBar.stories.jsx
import React from 'react';
import { CanvasChromeEditBar } from './CanvasChromeEditBar';

export default {
    title: 'Canvas/CanvasChromeEditBar',
    component: CanvasChromeEditBar,
    parameters: {
        layout: 'fullscreen',
    },
    argTypes: {
        onToolChange: { action: 'tool change' },
        onGridAction: { action: 'grid action' },
        onRowAction: { action: 'row action' },
        onDone: { action: 'done' },
    },
    decorators: [
        (Story) => (
            <div style={{ background: '#0c1220', padding: '24px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        activeTool: 'select',
    },
};

export const PanActive = {
    args: {
        activeTool: 'pan',
    },
};
