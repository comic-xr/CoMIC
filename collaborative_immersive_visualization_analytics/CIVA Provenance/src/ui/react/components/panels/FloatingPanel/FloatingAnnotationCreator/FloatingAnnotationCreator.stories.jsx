/**
 * @file FloatingAnnotationCreator.stories.jsx
 * @description Storybook stories for the FloatingAnnotationCreator component.
 * Demonstrates the draggable floating panel for creating annotations.
 */

import React, { useState } from 'react';
import { FloatingAnnotationCreator } from './index';

export default {
    title: 'Modals/FloatingAnnotationCreator',
    component: FloatingAnnotationCreator,
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
                    Click the button to open the floating annotation creator.
                    <br />
                    Drag by the header to reposition.
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
                <FloatingAnnotationCreator
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(text, type, position) => {
                        console.log('Annotation created:', { text, type, position });
                        setIsOpen(false);
                    }}
                    position={{ x: 0, y: 0, z: 0 }}
                    screenPosition={{ x: 200, y: 200 }}
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
            <FloatingAnnotationCreator
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSubmit={(text, type, position) => {
                    console.log('Annotation created:', { text, type, position });
                    setIsOpen(false);
                }}
                position={{ x: 1.5, y: -0.75, z: 2.125 }}
                screenPosition={{ x: 100, y: 100 }}
            />
        );
    },
};

// =============================================================================
// WITH POSITION DISPLAY
// =============================================================================

export const WithPosition = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        const [position, setPosition] = useState({ x: 12.345, y: -6.789, z: 0.123 });

        return (
            <div>
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Notice the position display - click the edit button to modify coordinates manually
                </p>
                <FloatingAnnotationCreator
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(text, type, pos) => {
                        console.log('Annotation created:', { text, type, position: pos });
                        setIsOpen(false);
                    }}
                    position={position}
                    screenPosition={{ x: 150, y: 100 }}
                    onPositionChange={(newPos) => {
                        console.log('Position changed:', newPos);
                        setPosition(newPos);
                    }}
                />
            </div>
        );
    },
};

// =============================================================================
// DRAGGABLE DEMO
// =============================================================================

export const DraggableDemo = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <div>
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Drag the panel by its header (or the grip icon) to reposition it anywhere on screen
                </p>
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    width: '200px',
                    height: '200px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '2px dashed #3b82f6',
                    borderRadius: '8px',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3b82f6',
                    fontSize: '14px',
                    textAlign: 'center',
                    padding: '16px',
                }}>
                    Simulated 3D View Area
                    <br />
                    (Drag the creator panel around)
                </div>
                <FloatingAnnotationCreator
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(text, type, position) => {
                        console.log('Annotation created:', { text, type, position });
                        setIsOpen(false);
                    }}
                    position={{ x: 0, y: 0, z: 0 }}
                    screenPosition={{ x: 50, y: 100 }}
                />
            </div>
        );
    },
};

// =============================================================================
// ALL TYPES SELECTION
// =============================================================================

export const AllTypesSelection = {
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
                        Created: {lastSubmitted.type} - "{lastSubmitted.text}" at ({lastSubmitted.position.x.toFixed(2)}, {lastSubmitted.position.y.toFixed(2)}, {lastSubmitted.position.z.toFixed(2)})
                    </div>
                )}
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Select different annotation types: Note (green), Warning (amber), Info (blue), Measurement (purple)
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
                    Reopen Creator
                </button>
                <FloatingAnnotationCreator
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSubmit={(text, type, position) => {
                        setLastSubmitted({ text, type, position });
                        setIsOpen(false);
                    }}
                    position={{ x: 5.5, y: -2.25, z: 1.0 }}
                    screenPosition={{ x: 200, y: 150 }}
                />
            </div>
        );
    },
};