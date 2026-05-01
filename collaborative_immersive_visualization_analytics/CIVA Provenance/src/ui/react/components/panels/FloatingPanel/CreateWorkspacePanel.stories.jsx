/**
 * @file CreateWorkspacePanel.stories.jsx
 * @description Storybook stories for CreateWorkspacePanel
 */

import React, { useState } from 'react';
import { CreateWorkspacePanel } from './CreateWorkspacePanel';

export default {
    title: 'Panels/CreateWorkspacePanel',
    component: CreateWorkspacePanel,
    parameters: {
        layout: 'fullscreen',
    },
};

// =============================================================================
// INTERACTIVE STORY
// =============================================================================

export const Interactive = () => {
    const [isOpen, setIsOpen] = useState(true);

    const handleCreate = async (data) => {
        console.log('Creating workspace:', data);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        alert(`Workspace "${data.name}" created successfully!`);
    };

    return (
        <div style={{ padding: '2rem' }}>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: '0.5rem 1rem',
                    background: '#60a5fa',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                }}
            >
                Open Create Workspace Panel
            </button>

            <CreateWorkspacePanel
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onCreate={handleCreate}
                userId="user-123"
                projectId="project-456"
            />
        </div>
    );
};

// =============================================================================
// STATES
// =============================================================================

export const ProjectWorkspace = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <CreateWorkspacePanel
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onCreate={async (data) => console.log('Create:', data)}
            userId="user-123"
            projectId="project-456"
        />
    );
};

export const BreakoutWorkspace = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <CreateWorkspacePanel
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onCreate={async (data) => console.log('Create:', data)}
            userId="user-123"
            projectId="project-456"
        />
    );
};

// =============================================================================
// ERROR STATES
// =============================================================================

export const WithValidationError = () => {
    const [isOpen, setIsOpen] = useState(true);

    const handleCreate = async (data) => {
        throw new Error('Workspace name already exists');
    };

    return (
        <CreateWorkspacePanel
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onCreate={handleCreate}
            userId="user-123"
            projectId="project-456"
        />
    );
};

export const LongContent = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <CreateWorkspacePanel
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onCreate={async (data) => console.log('Create:', data)}
            userId="user-123"
            projectId="project-456"
        />
    );
};
