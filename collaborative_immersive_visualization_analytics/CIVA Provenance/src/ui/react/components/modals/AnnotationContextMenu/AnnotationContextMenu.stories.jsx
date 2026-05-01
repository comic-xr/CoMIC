/**
 * @file AnnotationContextMenu.stories.jsx
 * @description Storybook stories for the AnnotationContextMenu component.
 * Demonstrates context menu with various annotation states.
 */

import React, { useState } from 'react';
import { AnnotationContextMenu } from './index';

export default {
    title: 'Modals/AnnotationContextMenu',
    component: AnnotationContextMenu,
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

// Sample annotation data
const sampleAnnotation = {
    id: 'ann-1',
    label: 'Important Finding',
    text: 'This region shows abnormal activity patterns that may indicate early stage pathology.',
    visible: true,
};

const hiddenAnnotation = {
    id: 'ann-2',
    label: 'Hidden Note',
    text: 'This annotation is currently hidden from view.',
    visible: false,
};

// =============================================================================
// DEFAULT (CLICK TO OPEN)
// =============================================================================

export const Default = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);
        const [position, setPosition] = useState({ x: 0, y: 0 });

        const handleContextMenu = (e) => {
            e.preventDefault();
            setPosition({ x: e.clientX, y: e.clientY });
            setIsOpen(true);
        };

        return (
            <div>
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Right-click on the annotation marker below to open the context menu
                </p>
                <div
                    onContextMenu={handleContextMenu}
                    style={{
                        width: '40px',
                        height: '40px',
                        background: 'rgba(74, 222, 128, 0.2)',
                        border: '2px solid #4ade80',
                        borderRadius: '50%',
                        cursor: 'context-menu',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4ade80',
                        fontSize: '20px',
                    }}
                    title="Right-click me!"
                >
                    📍
                </div>
                <AnnotationContextMenu
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    annotation={sampleAnnotation}
                    screenPosition={position}
                    onEdit={() => console.log('Edit clicked')}
                    onMove={() => console.log('Move clicked')}
                    onDelete={() => console.log('Delete clicked')}
                    onToggleVisibility={() => console.log('Toggle visibility clicked')}
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
            <AnnotationContextMenu
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                annotation={sampleAnnotation}
                screenPosition={{ x: 100, y: 100 }}
                onEdit={() => console.log('Edit clicked')}
                onMove={() => console.log('Move clicked')}
                onDelete={() => console.log('Delete clicked')}
                onToggleVisibility={() => console.log('Toggle visibility clicked')}
            />
        );
    },
};

// =============================================================================
// HIDDEN ANNOTATION
// =============================================================================

export const HiddenAnnotation = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        const [annotation, setAnnotation] = useState(hiddenAnnotation);

        return (
            <div>
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    This annotation is hidden - notice the "Show" option instead of "Hide"
                </p>
                <AnnotationContextMenu
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    annotation={annotation}
                    screenPosition={{ x: 100, y: 100 }}
                    onEdit={() => console.log('Edit clicked')}
                    onMove={() => console.log('Move clicked')}
                    onDelete={() => console.log('Delete clicked')}
                    onToggleVisibility={() => {
                        setAnnotation(prev => ({ ...prev, visible: !prev.visible }));
                        console.log('Toggle visibility clicked');
                    }}
                />
            </div>
        );
    },
};

// =============================================================================
// LONG LABEL
// =============================================================================

export const LongLabel = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        const longAnnotation = {
            id: 'ann-3',
            label: 'This is a very long annotation label that should be truncated',
            text: 'Sample text',
            visible: true,
        };

        return (
            <AnnotationContextMenu
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                annotation={longAnnotation}
                screenPosition={{ x: 100, y: 100 }}
                onEdit={() => console.log('Edit clicked')}
                onMove={() => console.log('Move clicked')}
                onDelete={() => console.log('Delete clicked')}
                onToggleVisibility={() => console.log('Toggle visibility clicked')}
            />
        );
    },
};

// =============================================================================
// WITH ACTION HANDLERS
// =============================================================================

export const WithActionHandlers = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        const [lastAction, setLastAction] = useState(null);

        return (
            <div>
                {lastAction && (
                    <div style={{
                        padding: '16px',
                        background: '#1a1a24',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        color: '#4ade80'
                    }}>
                        Action: {lastAction}
                    </div>
                )}
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
                    Reopen Menu
                </button>
                <AnnotationContextMenu
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    annotation={sampleAnnotation}
                    screenPosition={{ x: 200, y: 150 }}
                    onEdit={() => setLastAction('Edit')}
                    onMove={() => setLastAction('Move')}
                    onDelete={() => setLastAction('Delete')}
                    onToggleVisibility={() => setLastAction('Toggle Visibility')}
                />
            </div>
        );
    },
};