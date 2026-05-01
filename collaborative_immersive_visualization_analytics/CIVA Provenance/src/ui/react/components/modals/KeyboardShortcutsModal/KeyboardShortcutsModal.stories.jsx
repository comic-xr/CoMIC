/**
 * @file KeyboardShortcutsModal.stories.jsx
 * @description Storybook stories for the KeyboardShortcutsModal component.
 * Demonstrates keyboard shortcuts modal with various states and configurations.
 */

import React, { useState, useEffect } from 'react';
import { KeyboardShortcutsModal, ShortcutItem, KeyCombo } from './index';
import { Button } from '@UI/react/components/atoms/Button';

export default {
    title: 'Modals/KeyboardShortcutsModal',
    component: KeyboardShortcutsModal,
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

        // Register ? key to open
        useEffect(() => {
            const handleKey = (e) => {
                if (e.key === '?' && !e.target.matches('input, textarea')) {
                    e.preventDefault();
                    setIsOpen(true);
                }
            };
            document.addEventListener('keydown', handleKey);
            return () => document.removeEventListener('keydown', handleKey);
        }, []);

        return (
            <div>
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Press <kbd style={{ background: '#222', padding: '2px 8px', borderRadius: '4px', border: '1px solid #333' }}>?</kbd> or click the button to open shortcuts
                </p>
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    View Keyboard Shortcuts
                </Button>
                <KeyboardShortcutsModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
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
            <KeyboardShortcutsModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        );
    },
};

// =============================================================================
// DIFFERENT INITIAL CATEGORIES
// =============================================================================

export const NavigationCategory = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <KeyboardShortcutsModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                initialCategory="navigation"
            />
        );
    },
};

export const CanvasCategory = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <KeyboardShortcutsModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                initialCategory="canvas"
            />
        );
    },
};

export const ToolsCategory = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <KeyboardShortcutsModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                initialCategory="tools"
            />
        );
    },
};

export const CollaborationCategory = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <KeyboardShortcutsModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                initialCategory="collaboration"
            />
        );
    },
};

// =============================================================================
// WITHOUT SEARCH
// =============================================================================

export const WithoutSearch = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <KeyboardShortcutsModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                searchable={false}
            />
        );
    },
};

// =============================================================================
// KEYBOARD NAVIGATION DEMO
// =============================================================================

export const KeyboardNavigationDemo = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <div>
                <div style={{
                    padding: '16px',
                    background: '#1a1a24',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    color: '#888',
                    fontSize: '13px'
                }}>
                    <h3 style={{ color: '#fff', marginBottom: '12px' }}>Navigation Tips:</h3>
                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                        <li>Use <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '3px' }}>↓</kbd> / <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '3px' }}>↑</kbd> to navigate categories</li>
                        <li>Use <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '3px' }}>Home</kbd> / <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '3px' }}>End</kbd> to jump to first/last category</li>
                        <li>Type in search to filter shortcuts across all categories</li>
                        <li>Press <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '3px' }}>Esc</kbd> to close</li>
                    </ul>
                </div>
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    Open Modal
                </Button>
                <KeyboardShortcutsModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                />
            </div>
        );
    },
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

export const ShortcutItemComponent = {
    render: () => (
        <div style={{
            width: '400px',
            background: '#1a1a24',
            border: '1px solid #2a2a3a',
            borderRadius: '8px',
            padding: '16px'
        }}>
            <ShortcutItem
                action="Global Search"
                keys={['⌘', 'K']}
                description="Search everything"
            />
            <ShortcutItem
                action="Undo"
                keys={['⌘', 'Z']}
            />
            <ShortcutItem
                action="Redo"
                keys={['⌘', '⇧', 'Z']}
            />
            <ShortcutItem
                action="Delete Selected"
                keys={['Backspace']}
            />
            <ShortcutItem
                action="Push to Talk"
                keys={['Space']}
                description="Hold to talk"
            />
        </div>
    ),
};

export const KeyCombinationExamples = {
    render: () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '24px',
            background: '#1a1a24',
            border: '1px solid #2a2a3a',
            borderRadius: '8px',
            width: '300px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Single key:</span>
                <KeyCombo keys={['Esc']} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Two keys:</span>
                <KeyCombo keys={['⌘', 'S']} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Three keys:</span>
                <KeyCombo keys={['⌘', '⇧', 'Z']} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Arrow key:</span>
                <KeyCombo keys={['ArrowUp']} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Space:</span>
                <KeyCombo keys={['Space']} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Backspace:</span>
                <KeyCombo keys={['Backspace']} />
            </div>
        </div>
    ),
};