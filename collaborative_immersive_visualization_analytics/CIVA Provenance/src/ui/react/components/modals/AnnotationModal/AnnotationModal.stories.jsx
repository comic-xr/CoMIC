/**
 * @file AnnotationModal.stories.jsx
 * @description Storybook stories for the AnnotationModal component.
 * Demonstrates annotation creation modal with various states.
 */

import React, { useState } from 'react';
import { AnnotationModal } from './index';

export default {
    title: 'Modals/AnnotationModal',
    component: AnnotationModal,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', minHeight: '100vh' }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// DEFAULT
// =============================================================================

export const Default = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <div>
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Click the button to open the annotation modal
                </p>
                <button
                    style={{
                        padding: '8px 16px',
                        background: 'rgba(74, 222, 128, 0.15)',
                        border: '1px solid rgba(74, 222, 128, 0.4)',
                        borderRadius: '6px',
                        color: '#4ade80',
                        cursor: 'pointer',
                    }}
                    onClick={() => setIsOpen(true)}
                >
                    Create Annotation
                </button>
                <AnnotationModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(text, type) => {
                        console.log('Annotation created:', { text, type });
                        setIsOpen(false);
                    }}
                />
            </div>
        );
    },
};

// =============================================================================
// INITIALLY OPEN
// =============================================================================

export const InitiallyOpen = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <AnnotationModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSubmit={(text, type) => {
                    console.log('Annotation created:', { text, type });
                    setIsOpen(false);
                }}
            />
        );
    },
};

// =============================================================================
// WITH POSITION
// =============================================================================

export const WithPosition = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <AnnotationModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSubmit={(text, type) => {
                    console.log('Annotation created:', { text, type });
                    setIsOpen(false);
                }}
                position={{ x: 1.234, y: -0.567, z: 3.891 }}
            />
        );
    },
};

// =============================================================================
// ALL TYPES
// =============================================================================

export const AllTypes = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        const [lastSubmitted, setLastSubmitted] = useState(null);

        return (
            <div>
                {lastSubmitted && (
                    <div style={{
                        padding: '16px',
                        background: '#1a1a24',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        color: '#4ade80'
                    }}>
                        Created: {lastSubmitted.type} - "{lastSubmitted.text}"
                    </div>
                )}
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Try selecting different annotation types: Note, Warning, Info, Measurement
                </p>
                <button
                    style={{
                        padding: '8px 16px',
                        background: 'rgba(74, 222, 128, 0.15)',
                        border: '1px solid rgba(74, 222, 128, 0.4)',
                        borderRadius: '6px',
                        color: '#4ade80',
                        cursor: 'pointer',
                    }}
                    onClick={() => setIsOpen(true)}
                >
                    Open Modal
                </button>
                <AnnotationModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(text, type) => {
                        setLastSubmitted({ text, type });
                        setIsOpen(false);
                    }}
                    position={{ x: 0.5, y: 1.0, z: -0.25 }}
                />
            </div>
        );
    },
};