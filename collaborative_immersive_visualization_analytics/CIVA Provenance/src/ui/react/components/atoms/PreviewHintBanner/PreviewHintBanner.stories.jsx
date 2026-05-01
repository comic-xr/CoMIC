// src/ui/react/components/atoms/PreviewHintBanner/PreviewHintBanner.stories.jsx
import React, { useState } from 'react';
import { PreviewHintBanner } from './PreviewHintBanner';

export default {
    title: 'Atoms/PreviewHintBanner',
    component: PreviewHintBanner,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        visible: {
            control: 'boolean',
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        visible: true,
    },
};

export const Hidden = {
    args: {
        visible: false,
    },
};

export const InPanelContext = {
    render: () => (
        <div style={{
            width: '320px',
            background: '#1a1a2e',
            borderRadius: '8px',
            overflow: 'hidden',
        }}>
            <PreviewHintBanner visible />
            <div style={{ padding: '16px', color: '#e5e7eb' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Panel Content</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                    This panel is in preview mode. Click the pin button or interact with a tab to keep it open.
                </p>
            </div>
        </div>
    ),
};

export const WithToggle = {
    render: function WithToggleStory() {
        const [visible, setVisible] = useState(true);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button
                    onClick={() => setVisible((v) => !v)}
                    style={{
                        padding: '8px 16px',
                        background: '#374151',
                        color: '#e5e7eb',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}
                >
                    Toggle Banner ({visible ? 'Visible' : 'Hidden'})
                </button>
                <div style={{
                    width: '320px',
                    background: '#1a1a2e',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    minHeight: '60px',
                }}>
                    <PreviewHintBanner visible={visible} />
                    <div style={{ padding: '16px', color: '#9ca3af', fontSize: '12px' }}>
                        Panel content area
                    </div>
                </div>
            </div>
        );
    },
};

export const MultipleInStack = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
                width: '280px',
                background: '#1a1a2e',
                borderRadius: '8px',
                overflow: 'hidden',
            }}>
                <PreviewHintBanner visible />
                <div style={{ padding: '12px', color: '#9ca3af', fontSize: '12px' }}>
                    Files Panel (Preview)
                </div>
            </div>
            <div style={{
                width: '280px',
                background: '#1a1a2e',
                borderRadius: '8px',
                overflow: 'hidden',
            }}>
                <PreviewHintBanner visible />
                <div style={{ padding: '12px', color: '#9ca3af', fontSize: '12px' }}>
                    Properties Panel (Preview)
                </div>
            </div>
        </div>
    ),
};

export const NarrowWidth = {
    render: () => (
        <div style={{ width: '200px' }}>
            <PreviewHintBanner visible />
        </div>
    ),
};

export const WideWidth = {
    render: () => (
        <div style={{ width: '500px' }}>
            <PreviewHintBanner visible />
        </div>
    ),
};
