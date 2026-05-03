/**
 * @file NewProjectModal.stories.jsx
 * @description Storybook stories for the NewProjectModal component.
 * Demonstrates the new project form with various states.
 */

import React, { useState } from 'react';
import { NewProjectModal } from './index';
import { Button } from '@UI/react/components/atoms/Button';

export default {
    title: 'Modals/NewProjectModal',
    component: NewProjectModal,
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
        const [lastCreated, setLastCreated] = useState(null);

        const handleCreate = async (data) => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLastCreated(data);
            console.log('Created project:', data);
        };

        return (
            <div>
                <p style={{ color: '#888', marginBottom: '16px' }}>
                    Click the button to create a new project
                </p>
                <Button variant="primary" onClick={() => setIsOpen(true)}>
                    + New Project
                </Button>

                {lastCreated && (
                    <div style={{
                        marginTop: '24px',
                        padding: '16px',
                        background: '#1a1a24',
                        borderRadius: '8px',
                        border: '1px solid #2a2a3a'
                    }}>
                        <h3 style={{ color: '#fff', marginBottom: '8px' }}>Last Created Project:</h3>
                        <pre style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                            {JSON.stringify(lastCreated, null, 2)}
                        </pre>
                    </div>
                )}

                <NewProjectModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onCreate={handleCreate}
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

        const handleCreate = async (data) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('Created project:', data);
        };

        return (
            <NewProjectModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onCreate={handleCreate}
            />
        );
    },
};

// =============================================================================
// WITH LOADING STATE
// =============================================================================

export const WithLoadingState = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        const handleCreate = async (data) => {
            // Longer delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log('Created project:', data);
        };

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
                    <p>Fill in the form and click "Create Project" to see the loading state.</p>
                    <p style={{ marginTop: '8px' }}>The submit takes 3 seconds to simulate an API call.</p>
                </div>
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    Open Modal
                </Button>
                <NewProjectModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onCreate={handleCreate}
                />
            </div>
        );
    },
};

// =============================================================================
// WITH ERROR
// =============================================================================

export const WithError = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        const handleCreate = async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
            throw new Error('Project name already exists');
        };

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
                    <p>This demo simulates an error on form submission.</p>
                    <p style={{ marginTop: '8px' }}>Fill in the form and submit to see the error message.</p>
                </div>
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    Open Modal
                </Button>
                <NewProjectModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onCreate={handleCreate}
                />
            </div>
        );
    },
};

// =============================================================================
// QUICK CREATE FLOW
// =============================================================================

export const QuickCreateFlow = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);
        const [projects, setProjects] = useState([]);

        const handleCreate = async (data) => {
            await new Promise(resolve => setTimeout(resolve, 800));
            setProjects(prev => [...prev, { id: Date.now(), ...data }]);
        };

        return (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <Button variant="primary" onClick={() => setIsOpen(true)}>
                        + New Project
                    </Button>
                    <span style={{ color: '#888', fontSize: '13px' }}>
                        {projects.length} project{projects.length !== 1 ? 's' : ''} created
                    </span>
                </div>

                {projects.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '12px'
                    }}>
                        {projects.map(project => (
                            <div
                                key={project.id}
                                style={{
                                    padding: '16px',
                                    background: '#1a1a24',
                                    borderRadius: '8px',
                                    border: '1px solid #2a2a3a'
                                }}
                            >
                                <div style={{ color: '#fff', fontWeight: 500, marginBottom: '4px' }}>
                                    {project.name}
                                </div>
                                <div style={{ color: '#888', fontSize: '12px' }}>
                                    {project.template} • {project.visibility}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <NewProjectModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onCreate={handleCreate}
                />
            </div>
        );
    },
};

// =============================================================================
// TEMPLATE SELECTION DEMO
// =============================================================================

export const TemplateSelectionDemo = {
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
                    <h3 style={{ color: '#fff', marginBottom: '8px' }}>Available Templates:</h3>
                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                        <li><strong>Blank Project</strong> - Start fresh with empty canvas</li>
                        <li><strong>Research Lab</strong> - Scientific data analysis setup</li>
                        <li><strong>Data Analysis</strong> - Common tools and layouts</li>
                        <li><strong>Collaborative Review</strong> - Team review optimized</li>
                    </ul>
                </div>
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    Open Modal
                </Button>
                <NewProjectModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onCreate={async (data) => {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        console.log('Created with template:', data.template);
                    }}
                />
            </div>
        );
    },
};

// =============================================================================
// VISIBILITY OPTIONS DEMO
// =============================================================================

export const VisibilityOptionsDemo = {
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
                    <h3 style={{ color: '#fff', marginBottom: '8px' }}>Visibility Levels:</h3>
                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                        <li><strong>Private</strong> - Only you have access</li>
                        <li><strong>Team</strong> - Your team members can access</li>
                        <li><strong>Organization</strong> - Everyone in your organization</li>
                    </ul>
                </div>
                <Button variant="secondary" onClick={() => setIsOpen(true)}>
                    Open Modal
                </Button>
                <NewProjectModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onCreate={async (data) => {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        console.log('Created with visibility:', data.visibility);
                    }}
                />
            </div>
        );
    },
};