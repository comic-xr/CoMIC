/**
 * @file CanvasTabsBar.stories.jsx
 * @description Storybook stories for CanvasTabsBar component
 */

import React, { useState } from 'react';
import { CanvasTabsBar } from './CanvasTabsBar';
import { CanvasTab } from './CanvasTab';
import { ModeToggle } from './ModeToggle';
import { CreateOpenPopover } from './CreateOpenPopover';

export default {
    title: 'Organisms/CanvasTabsBar',
    component: CanvasTabsBar,
    parameters: {
        layout: 'padded',
        backgrounds: {
            default: 'dark',
        },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockWorkspaces = [
    { id: 'ws-1', name: 'Main Analysis', type: 'workspace', isOpen: true, hasChanges: false, hasBreakout: false },
    { id: 'ws-2', name: 'High Risk Patients', type: 'subset', isOpen: true, hasChanges: true, hasBreakout: false },
    { id: 'ws-3', name: 'Quick Notes', type: 'scratch', isOpen: true, hasChanges: false, hasBreakout: true, breakoutUsers: 3 },
    { id: 'ws-4', name: 'Comparison View', type: 'workspace', isOpen: true, hasChanges: false, hasBreakout: false },
    { id: 'ws-5', name: 'Archive', type: 'workspace', isOpen: false, hasChanges: false, hasBreakout: false },
    { id: 'ws-6', name: 'Draft Layout', type: 'scratch', isOpen: false, hasChanges: false, hasBreakout: false },
];

const manyWorkspaces = [
    ...mockWorkspaces.filter(w => w.isOpen),
    { id: 'ws-7', name: 'Extra View 1', type: 'workspace', isOpen: true, hasChanges: false, hasBreakout: false },
    { id: 'ws-8', name: 'Extra View 2', type: 'workspace', isOpen: true, hasChanges: false, hasBreakout: false },
    { id: 'ws-9', name: 'Extra View 3', type: 'subset', isOpen: true, hasChanges: false, hasBreakout: false },
    { id: 'ws-10', name: 'Extra View 4', type: 'scratch', isOpen: true, hasChanges: false, hasBreakout: false },
];

// =============================================================================
// STORIES - MAIN COMPONENT
// =============================================================================

/**
 * Default state with a few open workspaces
 */
export const Default = {
    args: {
        workspaces: mockWorkspaces,
        activeWorkspaceId: 'ws-1',
        mode: 'tabs',
        popoutCount: 0,
        breakoutCount: 0,
        hasActiveBreakout: false,
    },
};

/**
 * With active subset workspace showing amber accent
 */
export const SubsetActive = {
    args: {
        workspaces: mockWorkspaces,
        activeWorkspaceId: 'ws-2',
        mode: 'tabs',
        popoutCount: 0,
        breakoutCount: 0,
        hasActiveBreakout: false,
    },
};

/**
 * With active scratch workspace showing green accent
 */
export const ScratchActive = {
    args: {
        workspaces: mockWorkspaces,
        activeWorkspaceId: 'ws-3',
        mode: 'tabs',
        popoutCount: 0,
        breakoutCount: 0,
        hasActiveBreakout: false,
    },
};

/**
 * In tile mode instead of tabs mode
 */
export const TileMode = {
    args: {
        workspaces: mockWorkspaces,
        activeWorkspaceId: 'ws-1',
        mode: 'tile',
        popoutCount: 0,
        breakoutCount: 0,
        hasActiveBreakout: false,
    },
};

/**
 * With popout windows indicator
 */
export const WithPopouts = {
    args: {
        workspaces: mockWorkspaces,
        activeWorkspaceId: 'ws-1',
        mode: 'tabs',
        popoutCount: 2,
        breakoutCount: 0,
        hasActiveBreakout: false,
    },
};

/**
 * With active breakout sessions
 */
export const WithBreakouts = {
    args: {
        workspaces: mockWorkspaces,
        activeWorkspaceId: 'ws-1',
        mode: 'tabs',
        popoutCount: 0,
        breakoutCount: 3,
        hasActiveBreakout: true,
    },
};

/**
 * With both popouts and breakouts
 */
export const WithPopoutsAndBreakouts = {
    args: {
        workspaces: mockWorkspaces,
        activeWorkspaceId: 'ws-1',
        mode: 'tabs',
        popoutCount: 2,
        breakoutCount: 3,
        hasActiveBreakout: true,
    },
};

/**
 * With many workspaces causing overflow dropdown
 */
export const WithOverflow = {
    args: {
        workspaces: manyWorkspaces,
        activeWorkspaceId: 'ws-1',
        mode: 'tabs',
        popoutCount: 0,
        breakoutCount: 0,
        hasActiveBreakout: false,
    },
};

/**
 * Interactive story with state management
 */
export const Interactive = {
    render: function InteractiveStory() {
        const [workspaces, setWorkspaces] = useState(mockWorkspaces);
        const [activeId, setActiveId] = useState('ws-1');
        const [mode, setMode] = useState('tabs');

        const handleCreateWorkspace = (type) => {
            const newId = `ws-${Date.now()}`;
            const newWorkspace = {
                id: newId,
                name: type === 'subset' ? 'New Subset' : type === 'scratch' ? 'Untitled Scratch' : 'New Workspace',
                type: type,
                isOpen: true,
                hasChanges: false,
                hasBreakout: false,
            };
            setWorkspaces([...workspaces, newWorkspace]);
            setActiveId(newId);
        };

        const handleOpenWorkspace = (id) => {
            setWorkspaces(workspaces.map(w =>
                w.id === id ? { ...w, isOpen: true } : w
            ));
            setActiveId(id);
        };

        const handleCloseWorkspace = (id) => {
            setWorkspaces(workspaces.map(w =>
                w.id === id ? { ...w, isOpen: false } : w
            ));
            const openWorkspaces = workspaces.filter(w => w.isOpen && w.id !== id);
            if (openWorkspaces.length > 0 && activeId === id) {
                setActiveId(openWorkspaces[0].id);
            }
        };

        const handleRenameWorkspace = (id, name) => {
            setWorkspaces(workspaces.map(w =>
                w.id === id ? { ...w, name } : w
            ));
        };

        const handleReorderWorkspaces = (fromId, toId) => {
            const fromIndex = workspaces.findIndex(w => w.id === fromId);
            const toIndex = workspaces.findIndex(w => w.id === toId);
            const newWorkspaces = [...workspaces];
            const [moved] = newWorkspaces.splice(fromIndex, 1);
            newWorkspaces.splice(toIndex, 0, moved);
            setWorkspaces(newWorkspaces);
        };

        return (
            <div>
                <CanvasTabsBar
                    workspaces={workspaces}
                    activeWorkspaceId={activeId}
                    onSelectWorkspace={setActiveId}
                    onCreateWorkspace={handleCreateWorkspace}
                    onOpenWorkspace={handleOpenWorkspace}
                    onCloseWorkspace={handleCloseWorkspace}
                    onRenameWorkspace={handleRenameWorkspace}
                    onReorderWorkspaces={handleReorderWorkspaces}
                    mode={mode}
                    onModeChange={setMode}
                    popoutCount={0}
                    breakoutCount={0}
                    hasActiveBreakout={false}
                />
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '12px', color: '#888' }}>
                    <p><strong>Instructions:</strong></p>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>Click tabs to switch workspaces</li>
                        <li>Double-click tab name to rename</li>
                        <li>Drag tabs to reorder</li>
                        <li>Click + to create/open workspaces</li>
                        <li>Toggle Tile/Tabs mode</li>
                    </ul>
                    <p style={{ marginTop: '8px' }}><strong>Active:</strong> {activeId}</p>
                    <p><strong>Mode:</strong> {mode}</p>
                </div>
            </div>
        );
    },
};

// =============================================================================
// STORIES - SUB-COMPONENTS
// =============================================================================

/**
 * Individual CanvasTab component
 */
export const TabVariants = {
    render: function TabVariantsStory() {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Workspace (blue)</p>
                    <CanvasTab
                        workspace={{ id: '1', name: 'Main Analysis', type: 'workspace', hasChanges: false, hasBreakout: false }}
                        isActive={false}
                    />
                </div>
                <div>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Workspace - Active</p>
                    <CanvasTab
                        workspace={{ id: '2', name: 'Main Analysis', type: 'workspace', hasChanges: false, hasBreakout: false }}
                        isActive={true}
                    />
                </div>
                <div>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Subset (amber) with unsaved changes</p>
                    <CanvasTab
                        workspace={{ id: '3', name: 'High Risk Patients', type: 'subset', hasChanges: true, hasBreakout: false }}
                        isActive={false}
                    />
                </div>
                <div>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Scratch (green) with breakout</p>
                    <CanvasTab
                        workspace={{ id: '4', name: 'Quick Notes', type: 'scratch', hasChanges: false, hasBreakout: true }}
                        isActive={false}
                    />
                </div>
            </div>
        );
    },
};

/**
 * ModeToggle component
 */
export const ModeToggleStory = {
    name: 'Mode Toggle',
    render: function ModeToggleDemo() {
        const [mode, setMode] = useState('tabs');
        return (
            <div>
                <ModeToggle mode={mode} onModeChange={setMode} />
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                    Current mode: {mode}
                </p>
            </div>
        );
    },
};

/**
 * CreateOpenPopover component
 */
export const CreatePopoverStory = {
    name: 'Create/Open Popover',
    render: function CreatePopoverDemo() {
        const [isOpen, setIsOpen] = useState(true);
        return (
            <div style={{ position: 'relative', height: '400px' }}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        padding: '8px 16px',
                        background: '#333',
                        border: '1px solid #555',
                        borderRadius: '6px',
                        color: '#fff',
                        cursor: 'pointer',
                    }}
                >
                    Toggle Popover
                </button>
                <div style={{ position: 'absolute', top: '40px', left: 0 }}>
                    <CreateOpenPopover
                        isOpen={isOpen}
                        onClose={() => setIsOpen(false)}
                        workspaces={mockWorkspaces}
                        onCreateWorkspace={(type) => console.log('Create:', type)}
                        onOpenWorkspace={(id) => console.log('Open:', id)}
                    />
                </div>
            </div>
        );
    },
};
