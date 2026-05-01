/**
 * @file RecordingConsentModal.stories.jsx
 * @description Storybook stories for RecordingConsentModal component.
 */

import React, { useState } from 'react';
import RecordingConsentModal from './RecordingConsentModal';

export default {
    title: 'Modals/RecordingConsentModal',
    component: RecordingConsentModal,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'Modal that appears when another user starts recording a session, requiring acknowledgment before continuing.',
            },
        },
    },
    argTypes: {
        isOpen: {
            control: 'boolean',
            description: 'Whether modal is visible',
        },
        recorderName: {
            control: 'text',
            description: 'Name of user who started recording',
        },
        recordingOptions: {
            control: 'object',
            description: 'What is being recorded',
        },
        onContinue: {
            action: 'continued',
            description: 'User accepts and continues',
        },
        onLeave: {
            action: 'left',
            description: 'User leaves the room',
        },
    },
};

// Interactive wrapper for modal stories
const ModalWrapper = ({ children, ...props }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [action, setAction] = useState(null);

    const handleContinue = () => {
        setAction('continued');
        setIsOpen(false);
    };

    const handleLeave = () => {
        setAction('left');
        setIsOpen(false);
    };

    return (
        <div>
            <button
                onClick={() => {
                    setIsOpen(true);
                    setAction(null);
                }}
                style={{
                    padding: '10px 20px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                }}
            >
                Simulate Recording Started
            </button>
            {action && (
                <p style={{ marginTop: '16px', fontSize: '14px', color: '#888' }}>
                    User action: <strong>{action}</strong>
                </p>
            )}
            {React.cloneElement(children, {
                ...props,
                isOpen,
                onContinue: handleContinue,
                onLeave: handleLeave,
            })}
        </div>
    );
};

/**
 * Default state with all recording options enabled.
 */
export const AllOptionsEnabled = {
    render: (args) => (
        <ModalWrapper>
            <RecordingConsentModal {...args} />
        </ModalWrapper>
    ),
    args: {
        recorderName: 'John Doe',
        recordingOptions: {
            screen: true,
            audio: true,
            webcam: true,
            chat: true,
        },
    },
};

/**
 * Typical recording scenario - screen and audio only.
 */
export const ScreenAndAudioOnly = {
    render: (args) => (
        <ModalWrapper>
            <RecordingConsentModal {...args} />
        </ModalWrapper>
    ),
    args: {
        recorderName: 'Sarah Chen',
        recordingOptions: {
            screen: true,
            audio: true,
            webcam: false,
            chat: false,
        },
    },
};

/**
 * Screen recording only - no audio or video.
 */
export const ScreenOnly = {
    render: (args) => (
        <ModalWrapper>
            <RecordingConsentModal {...args} />
        </ModalWrapper>
    ),
    args: {
        recorderName: 'Mike Johnson',
        recordingOptions: {
            screen: true,
            audio: false,
            webcam: false,
            chat: false,
        },
    },
};

/**
 * Full collaboration recording - screen, audio, and chat.
 */
export const CollaborationRecording = {
    render: (args) => (
        <ModalWrapper>
            <RecordingConsentModal {...args} />
        </ModalWrapper>
    ),
    args: {
        recorderName: 'Dr. Emily Brown',
        recordingOptions: {
            screen: true,
            audio: true,
            webcam: false,
            chat: true,
        },
    },
};

/**
 * Webcam-focused recording.
 */
export const WebcamFocused = {
    render: (args) => (
        <ModalWrapper>
            <RecordingConsentModal {...args} />
        </ModalWrapper>
    ),
    args: {
        recorderName: 'Alex Wilson',
        recordingOptions: {
            screen: false,
            audio: true,
            webcam: true,
            chat: false,
        },
    },
};

/**
 * Long recorder name.
 */
export const LongRecorderName = {
    render: (args) => (
        <ModalWrapper>
            <RecordingConsentModal {...args} />
        </ModalWrapper>
    ),
    args: {
        recorderName: 'Dr. Alexandra von Steinberg-Wellington III',
        recordingOptions: {
            screen: true,
            audio: true,
            webcam: false,
            chat: true,
        },
    },
};

/**
 * Minimal recording - chat only.
 */
export const ChatOnly = {
    render: (args) => (
        <ModalWrapper>
            <RecordingConsentModal {...args} />
        </ModalWrapper>
    ),
    args: {
        recorderName: 'System Administrator',
        recordingOptions: {
            screen: false,
            audio: false,
            webcam: false,
            chat: true,
        },
    },
};

/**
 * Interactive demo showing modal cannot be closed with Escape.
 */
export const CannotEscapeDemo = {
    render: (args) => (
        <div>
            <ModalWrapper>
                <RecordingConsentModal {...args} />
            </ModalWrapper>
            <p style={{ marginTop: '24px', fontSize: '12px', color: '#666', maxWidth: '300px' }}>
                <strong>Note:</strong> This modal cannot be closed by pressing Escape or clicking the backdrop.
                Users must explicitly choose to Continue or Leave.
            </p>
        </div>
    ),
    args: {
        recorderName: 'Jane Smith',
        recordingOptions: {
            screen: true,
            audio: true,
            webcam: false,
            chat: true,
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates that the modal cannot be dismissed with Escape key - users must click a button.',
            },
        },
    },
};