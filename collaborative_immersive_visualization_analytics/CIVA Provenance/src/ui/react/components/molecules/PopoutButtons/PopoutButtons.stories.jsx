// src/ui/react/components/molecules/PopoutButtons/PopoutButtons.stories.jsx

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';

// Mock component for Storybook since the real component depends on context providers
const MockPopoutButtons = ({
    isNavigatorActive = false,
    isScratchPadActive = false,
    onToggleNavigator,
    onToggleScratchPad,
}) => {
    return (
        <div className="popout-buttons" style={{
            display: 'flex',
            gap: '4px',
        }}>
            <Tooltip content="Canvas Navigator">
                <button
                    className={`popout-buttons__btn ${isNavigatorActive ? 'active' : ''}`}
                    onClick={onToggleNavigator}
                    aria-pressed={isNavigatorActive}
                    type="button"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: isNavigatorActive ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${isNavigatorActive ? 'rgba(96, 165, 250, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '4px',
                        color: isNavigatorActive ? '#60a5fa' : '#9ca3af',
                        cursor: 'pointer',
                    }}
                >
                    <Icon name="map" size={16} />
                </button>
            </Tooltip>

            <Tooltip content="Scratch Pad">
                <button
                    className={`popout-buttons__btn ${isScratchPadActive ? 'active' : ''}`}
                    onClick={onToggleScratchPad}
                    aria-pressed={isScratchPadActive}
                    type="button"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: isScratchPadActive ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${isScratchPadActive ? 'rgba(96, 165, 250, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '4px',
                        color: isScratchPadActive ? '#60a5fa' : '#9ca3af',
                        cursor: 'pointer',
                    }}
                >
                    <Icon name="stickyNote" size={16} />
                </button>
            </Tooltip>
        </div>
    );
};

export default {
    title: 'Molecules/PopoutButtons',
    component: MockPopoutButtons,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        isNavigatorActive: {
            control: 'boolean',
            description: 'Whether the navigator panel is floating/active',
        },
        isScratchPadActive: {
            control: 'boolean',
            description: 'Whether the scratch pad is open',
        },
        onToggleNavigator: { action: 'toggleNavigator' },
        onToggleScratchPad: { action: 'toggleScratchPad' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    args: {
        isNavigatorActive: false,
        isScratchPadActive: false,
    },
};

export const NavigatorActive = {
    args: {
        isNavigatorActive: true,
        isScratchPadActive: false,
    },
};

export const ScratchPadActive = {
    args: {
        isNavigatorActive: false,
        isScratchPadActive: true,
    },
};

export const BothActive = {
    args: {
        isNavigatorActive: true,
        isScratchPadActive: true,
    },
};

// =============================================================================
// INTERACTIVE EXAMPLE
// =============================================================================

export const Interactive = {
    render: function InteractiveStory() {
        const [isNavigatorActive, setNavigatorActive] = useState(false);
        const [isScratchPadActive, setScratchPadActive] = useState(false);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <MockPopoutButtons
                    isNavigatorActive={isNavigatorActive}
                    isScratchPadActive={isScratchPadActive}
                    onToggleNavigator={() => setNavigatorActive(!isNavigatorActive)}
                    onToggleScratchPad={() => setScratchPadActive(!isScratchPadActive)}
                />
                <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                    <div>Navigator: {isNavigatorActive ? 'Floating' : 'Docked'}</div>
                    <div>Scratch Pad: {isScratchPadActive ? 'Open' : 'Closed'}</div>
                </div>
            </div>
        );
    },
};

// =============================================================================
// IN CONTEXT
// =============================================================================

export const InFooterContext = {
    render: function FooterContextStory() {
        const [isNavigatorActive, setNavigatorActive] = useState(false);
        const [isScratchPadActive, setScratchPadActive] = useState(true);

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '400px',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.6)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#666' }}>Canvas: 3x3</span>
                    <span style={{ fontSize: '11px', color: '#444' }}>|</span>
                    <span style={{ fontSize: '11px', color: '#666' }}>Viewport: 2x2</span>
                </div>
                <MockPopoutButtons
                    isNavigatorActive={isNavigatorActive}
                    isScratchPadActive={isScratchPadActive}
                    onToggleNavigator={() => setNavigatorActive(!isNavigatorActive)}
                    onToggleScratchPad={() => setScratchPadActive(!isScratchPadActive)}
                />
            </div>
        );
    },
};
