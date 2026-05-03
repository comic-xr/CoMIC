// src/ui/react/components/workspace/Canvas/CanvasChrome/CanvasChromeFooter2.stories.jsx
import React from 'react';
import { CanvasChromeFooter2 } from './CanvasChromeFooter2';
import { mockLinks } from '../__fixtures__/canvasFixtures';

export default {
    title: 'Canvas/CanvasChromeFooter2',
    component: CanvasChromeFooter2,
    parameters: {
        layout: 'fullscreen',
    },
    argTypes: {
        onToggleFocus: { action: 'toggle focus' },
        onOpenViewList: { action: 'open view list' },
        onSnapshot: { action: 'snapshot' },
        onResetView: { action: 'reset view' },
        onCopyView: { action: 'copy view' },
        onOpenSettings: { action: 'open settings' },
        onMoveViewport: { action: 'move viewport' },
        onHome: { action: 'home' },
        onOpenNavigator: { action: 'open navigator' },
        onUpdateLink: { action: 'update link' },
        onToggleVR: { action: 'toggle vr' },
    },
    decorators: [
        (Story, context) => (
            <div
                style={{
                    background: '#060a12',
                    padding: '24px',
                    width: context.args.containerWidth || 1200,
                }}
            >
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        canvasSize: { cols: 5, rows: 4 },
        viewportSize: { cols: 2, rows: 2 },
        viewportPosition: { col: 1, row: 1 },
        containerWidth: 1200,
        hasActiveView: true,
        links: mockLinks,
        isVRAvailable: true,
        isInVR: false,
    },
};

export const LinksCompact = {
    args: {
        ...Default.args,
        containerWidth: 820,
    },
};

export const WrappedLayout = {
    args: {
        ...Default.args,
        containerWidth: 620,
    },
};
