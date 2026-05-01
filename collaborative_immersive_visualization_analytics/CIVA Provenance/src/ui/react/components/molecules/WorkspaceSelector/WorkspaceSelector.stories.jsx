// src/ui/react/components/molecules/WorkspaceSelector/WorkspaceSelector.stories.jsx
import React, { useState } from 'react';
import { WorkspaceSelector } from './WorkspaceSelector';

// Mock workspaces data
const mockWorkspaces = [
    { id: '1', name: 'Main Project', type: 'project' },
    { id: '2', name: 'Data Analysis', type: 'project' },
    { id: '3', name: 'Team Discussion', type: 'breakout' },
    { id: '4', name: 'Brainstorm Room', type: 'breakout' },
    { id: '5', name: 'My Notes', type: 'personal' },
    { id: '6', name: 'Scratch Pad', type: 'personal' },
];

export default {
    title: 'Molecules/WorkspaceSelector',
    component: WorkspaceSelector,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        onSelect: { action: 'selected' },
        onCreate: { action: 'create' },
        hideLabel: { control: 'boolean' },
        label: { control: 'text' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', minHeight: '400px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        workspace: mockWorkspaces[0],
        workspaces: mockWorkspaces,
    },
};

export const ProjectWorkspace = {
    args: {
        workspace: { id: '1', name: 'Main Project', type: 'project' },
        workspaces: mockWorkspaces,
    },
};

export const BreakoutWorkspace = {
    args: {
        workspace: { id: '3', name: 'Team Discussion', type: 'breakout' },
        workspaces: mockWorkspaces,
    },
};

export const PersonalWorkspace = {
    args: {
        workspace: { id: '5', name: 'My Notes', type: 'personal' },
        workspaces: mockWorkspaces,
    },
};

export const NoWorkspaceSelected = {
    args: {
        workspace: null,
        workspaces: mockWorkspaces,
    },
};

export const EmptyWorkspaceList = {
    args: {
        workspace: null,
        workspaces: [],
    },
};

export const HiddenLabel = {
    args: {
        workspace: mockWorkspaces[0],
        workspaces: mockWorkspaces,
        hideLabel: true,
    },
};

export const Interactive = {
    render: function InteractiveStory() {
        const [selected, setSelected] = useState(mockWorkspaces[0]);
        const [workspaces, setWorkspaces] = useState(mockWorkspaces);

        const handleCreate = () => {
            const newWorkspace = {
                id: `${Date.now()}`,
                name: `New Workspace ${workspaces.length + 1}`,
                type: 'project',
            };
            setWorkspaces([...workspaces, newWorkspace]);
            setSelected(newWorkspace);
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
                <WorkspaceSelector
                    workspace={selected}
                    workspaces={workspaces}
                    onSelect={setSelected}
                    onCreate={handleCreate}
                />
                <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                    Selected: {selected?.name || 'None'} ({selected?.type || 'N/A'})
                </div>
            </div>
        );
    },
};
