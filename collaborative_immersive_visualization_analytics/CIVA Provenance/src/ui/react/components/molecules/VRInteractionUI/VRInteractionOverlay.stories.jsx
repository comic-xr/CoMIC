// src/ui/react/components/molecules/VRInteractionUI/VRInteractionOverlay.stories.jsx
import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock VRInteractionOverlay since the real component requires VRInteractionContext
const MockVRInteractionOverlay = ({
    interactionType = null,
    interactionStep = 1,
    selectionType = null,
    selectionData = null,
    isVisible = true,
}) => {
    if (!isVisible) return null;

    const overlayStyle = {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 32px',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center',
        minWidth: '280px',
    };

    const iconStyle = {
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(96, 165, 250, 0.2)',
        borderRadius: '12px',
        marginBottom: '12px',
        color: '#60a5fa',
    };

    const titleStyle = {
        fontSize: '16px',
        fontWeight: 600,
        color: '#e5e7eb',
        marginBottom: '8px',
    };

    const instructionStyle = {
        fontSize: '14px',
        color: '#9ca3af',
        marginBottom: '12px',
    };

    const hintStyle = {
        fontSize: '12px',
        color: '#6b7280',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    };

    // Linking Mode
    if (interactionType === 'link') {
        return (
            <div style={overlayStyle}>
                <div style={iconStyle}>
                    <Icon name="link2" size={20} />
                </div>
                <div style={titleStyle}>Linking Mode</div>
                <div style={instructionStyle}>
                    {interactionStep === 1
                        ? 'Point at a view and press trigger to link'
                        : 'Confirm link target'
                    }
                </div>
                <div style={hintStyle}>
                    Press B to cancel
                </div>
            </div>
        );
    }

    // Reorder Mode
    if (selectionType === 'reorder') {
        return (
            <div style={overlayStyle}>
                <div style={iconStyle}>
                    <Icon name="gripVertical" size={20} />
                </div>
                <div style={titleStyle}>Reordering</div>
                <div style={instructionStyle}>
                    Use thumbstick up/down to move item
                </div>
                <div style={hintStyle}>
                    Press A to confirm &bull; Press B to cancel
                </div>
            </div>
        );
    }

    // Resize Mode
    if (selectionType === 'resize') {
        return (
            <div style={overlayStyle}>
                <div style={iconStyle}>
                    <Icon name="maximize" size={20} />
                </div>
                <div style={titleStyle}>Resizing ({selectionData?.edge || 'edge'})</div>
                <div style={instructionStyle}>
                    Use thumbstick to adjust size
                </div>
                <div style={hintStyle}>
                    Press A to confirm &bull; Press B to cancel
                </div>
            </div>
        );
    }

    // Transfer Mode
    if (interactionType === 'transfer') {
        return (
            <div style={overlayStyle}>
                <div style={iconStyle}>
                    <Icon name="move" size={20} />
                </div>
                <div style={titleStyle}>Transfer Mode</div>
                <div style={instructionStyle}>
                    Point at destination and press trigger
                </div>
                <div style={hintStyle}>
                    Press B to cancel
                </div>
            </div>
        );
    }

    return null;
};

export default {
    title: 'Molecules/VRInteractionUI',
    component: MockVRInteractionOverlay,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        interactionType: {
            control: 'select',
            options: [null, 'link', 'transfer'],
        },
        interactionStep: {
            control: 'number',
            min: 1,
            max: 3,
        },
        selectionType: {
            control: 'select',
            options: [null, 'reorder', 'resize'],
        },
        isVisible: { control: 'boolean' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Story />
            </div>
        ),
    ],
};

export const LinkingModeStep1 = {
    args: {
        interactionType: 'link',
        interactionStep: 1,
        isVisible: true,
    },
};

export const LinkingModeStep2 = {
    args: {
        interactionType: 'link',
        interactionStep: 2,
        isVisible: true,
    },
};

export const ReorderMode = {
    args: {
        selectionType: 'reorder',
        isVisible: true,
    },
};

export const ResizeMode = {
    args: {
        selectionType: 'resize',
        selectionData: { edge: 'right' },
        isVisible: true,
    },
};

export const TransferMode = {
    args: {
        interactionType: 'transfer',
        isVisible: true,
    },
};

export const Hidden = {
    args: {
        isVisible: false,
    },
};

export const AllModes = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <MockVRInteractionOverlay interactionType="link" interactionStep={1} isVisible />
            <MockVRInteractionOverlay selectionType="reorder" isVisible />
            <MockVRInteractionOverlay selectionType="resize" selectionData={{ edge: 'bottom' }} isVisible />
            <MockVRInteractionOverlay interactionType="transfer" isVisible />
        </div>
    ),
};

export const InContext = {
    render: () => (
        <div style={{
            position: 'relative',
            width: '600px',
            height: '400px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            {/* Simulated VR scene background */}
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridTemplateRows: 'repeat(3, 1fr)',
                gap: '8px',
                padding: '16px',
                opacity: 0.3,
            }}>
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                    }} />
                ))}
            </div>

            {/* Overlay */}
            <MockVRInteractionOverlay interactionType="link" interactionStep={1} isVisible />
        </div>
    ),
};
