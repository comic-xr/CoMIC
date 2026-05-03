/**
 * @file HelpModal.stories.jsx
 * @description Storybook stories for the HelpModal component.
 * Demonstrates help modal with various states and configurations.
 */

import React, { useState } from 'react';
import { HelpModal } from './index';
import { Button } from '@UI/react/components/atoms/Button';

export default {
    title: 'Modals/HelpModal',
    component: HelpModal,
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
                    Click the button to open the help modal
                </p>
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    Open Help
                </Button>
                <HelpModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    version="1.0.0"
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
            <HelpModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                version="1.0.0"
            />
        );
    },
};

// =============================================================================
// WITH INITIAL SECTION
// =============================================================================

export const DocumentationSection = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <HelpModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                initialSection="documentation"
                version="1.0.0"
            />
        );
    },
};

export const VideoTutorialsSection = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <HelpModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                initialSection="videos"
                version="1.0.0"
            />
        );
    },
};

export const SupportSection = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <HelpModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                initialSection="support"
                version="1.0.0"
            />
        );
    },
};

// =============================================================================
// WITH SHORTCUTS CALLBACK
// =============================================================================

export const WithShortcutsCallback = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        const [shortcutsOpened, setShortcutsOpened] = useState(false);

        return (
            <div>
                {shortcutsOpened && (
                    <div style={{
                        padding: '16px',
                        background: '#1a1a24',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        color: '#4ade80'
                    }}>
                        Keyboard shortcuts modal would open here!
                    </div>
                )}
                <HelpModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    initialSection="shortcuts"
                    version="1.0.0"
                    onOpenShortcuts={() => {
                        setShortcutsOpened(true);
                        setTimeout(() => setShortcutsOpened(false), 3000);
                    }}
                />
            </div>
        );
    },
};

// =============================================================================
// ALL SECTIONS EXPANDED
// =============================================================================

export const AllSectionsDemo = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <div>
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Click on section headers to expand/collapse. Multiple sections can be open at once.
                </p>
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    Open Help
                </Button>
                <HelpModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    version="2.5.0-beta"
                />
            </div>
        );
    },
};

// =============================================================================
// WITHOUT VERSION
// =============================================================================

export const WithoutVersion = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <HelpModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        );
    },
};