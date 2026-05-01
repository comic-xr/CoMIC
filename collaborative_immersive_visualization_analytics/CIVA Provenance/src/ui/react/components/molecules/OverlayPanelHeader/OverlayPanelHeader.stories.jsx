// src/ui/react/components/molecules/OverlayPanelHeader/OverlayPanelHeader.stories.jsx
import React, { useState } from 'react';
import { OverlayPanelHeader } from './OverlayPanelHeader';

export default {
    title: 'Molecules/OverlayPanelHeader',
    component: OverlayPanelHeader,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        title: {
            control: 'text',
        },
        isPreview: {
            control: 'boolean',
        },
        onClose: { action: 'closed' },
        onPin: { action: 'pinned' },
        onPopOut: { action: 'popped out' },
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
        title: 'Panel Title',
        isPreview: false,
    },
};

export const PreviewMode = {
    args: {
        title: 'Files',
        isPreview: true,
    },
};

export const PinnedMode = {
    args: {
        title: 'Properties',
        isPreview: false,
    },
};

export const WithPopOut = {
    args: {
        title: 'Settings',
        isPreview: false,
        onPopOut: () => console.log('Pop out clicked'),
    },
};

export const PreviewWithPopOut = {
    args: {
        title: 'Data Explorer',
        isPreview: true,
        onPopOut: () => console.log('Pop out clicked'),
    },
};

export const NoTitle = {
    args: {
        title: '',
        isPreview: false,
    },
};

export const LongTitle = {
    args: {
        title: 'Very Long Panel Title That Might Overflow',
        isPreview: false,
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
            <OverlayPanelHeader
                title="Files"
                isPreview={false}
                onClose={() => console.log('Close')}
                onPopOut={() => console.log('Pop out')}
            />
            <div style={{ padding: '16px', color: '#9ca3af', fontSize: '12px' }}>
                Panel content goes here
            </div>
        </div>
    ),
};

export const PreviewInPanelContext = {
    render: () => (
        <div style={{
            width: '320px',
            background: '#1a1a2e',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(100, 149, 237, 0.3)',
        }}>
            <OverlayPanelHeader
                title="Quick View"
                isPreview={true}
                onPin={() => console.log('Pin')}
                onPopOut={() => console.log('Pop out')}
            />
            <div style={{ padding: '16px', color: '#9ca3af', fontSize: '12px' }}>
                Preview panel content - click Pin to keep open
            </div>
        </div>
    ),
};

export const InteractiveToggle = {
    render: function InteractiveToggleStory() {
        const [isPreview, setIsPreview] = useState(true);
        const [isOpen, setIsOpen] = useState(true);

        const handlePin = () => {
            setIsPreview(false);
        };

        const handleClose = () => {
            setIsOpen(false);
        };

        if (!isOpen) {
            return (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '12px' }}>
                        Panel closed
                    </p>
                    <button
                        onClick={() => { setIsOpen(true); setIsPreview(true); }}
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
                        Reopen as Preview
                    </button>
                </div>
            );
        }

        return (
            <div style={{
                width: '320px',
                background: '#1a1a2e',
                borderRadius: '8px',
                overflow: 'hidden',
                border: isPreview ? '1px solid rgba(100, 149, 237, 0.3)' : '1px solid transparent',
            }}>
                <OverlayPanelHeader
                    title={isPreview ? 'Preview Panel' : 'Pinned Panel'}
                    isPreview={isPreview}
                    onPin={handlePin}
                    onClose={handleClose}
                    onPopOut={() => console.log('Pop out')}
                />
                <div style={{ padding: '16px', color: '#9ca3af', fontSize: '12px' }}>
                    <p style={{ margin: 0 }}>
                        Mode: <strong style={{ color: '#e5e7eb' }}>{isPreview ? 'Preview' : 'Pinned'}</strong>
                    </p>
                    <p style={{ margin: '8px 0 0 0' }}>
                        {isPreview ? 'Click Pin to keep this panel open' : 'Click X to close this panel'}
                    </p>
                </div>
            </div>
        );
    },
};

export const AllVariants = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
                width: '300px',
                background: '#1a1a2e',
                borderRadius: '8px',
            }}>
                <OverlayPanelHeader
                    title="Pinned - No Pop Out"
                    isPreview={false}
                    onClose={() => {}}
                />
            </div>
            <div style={{
                width: '300px',
                background: '#1a1a2e',
                borderRadius: '8px',
            }}>
                <OverlayPanelHeader
                    title="Pinned - With Pop Out"
                    isPreview={false}
                    onClose={() => {}}
                    onPopOut={() => {}}
                />
            </div>
            <div style={{
                width: '300px',
                background: '#1a1a2e',
                borderRadius: '8px',
            }}>
                <OverlayPanelHeader
                    title="Preview - No Pop Out"
                    isPreview={true}
                    onPin={() => {}}
                />
            </div>
            <div style={{
                width: '300px',
                background: '#1a1a2e',
                borderRadius: '8px',
            }}>
                <OverlayPanelHeader
                    title="Preview - With Pop Out"
                    isPreview={true}
                    onPin={() => {}}
                    onPopOut={() => {}}
                />
            </div>
        </div>
    ),
};
