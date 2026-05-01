/**
 * @file RightPanelContext.jsx
 * @description Shared state and tab registry for Right Panel.
 * SINGLE SOURCE OF TRUTH for tab configuration and rendering.
 *
 * Tab Order (per spec):
 * 1. People (pink) - PRESENCE & LOCATION
 * 2. Voice (green) - PRESENCE & LOCATION
 * 3. Rooms (purple) - PRESENCE & LOCATION
 * --- divider ---
 * 4. Chat (blue) - COMMUNICATION
 * 5. Activity (amber) - COMMUNICATION
 * --- divider ---
 * 6. Notes (teal) - DOCUMENTATION
 * 7. Recording (red) - DOCUMENTATION
 * --- divider ---
 * 8. Settings (indigo)
 *
 * @see Right_Panel_Design_Specification.md
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// =============================================================================
// TAB CONFIGURATION - SINGLE SOURCE OF TRUTH
// =============================================================================

/**
 * Tab configuration matching specification.
 * This is the SINGLE SOURCE OF TRUTH for right panel tabs.
 * 
 * DO NOT create local TABS arrays elsewhere - import this instead.
 */
export const RIGHT_PANEL_TABS = [
    // PRESENCE & LOCATION
    {
        id: 'people',
        icon: 'users',
        label: 'People',
        color: 'pink',
        group: 'presence',
        contentComponent: 'PeoplePanelContent',
    },
    {
        id: 'voice',
        icon: 'mic',
        label: 'Voice',
        color: 'green',
        group: 'presence',
        contentComponent: 'VoicePanelContent',
    },
    {
        id: 'rooms',
        icon: 'doorOpen',
        label: 'Rooms',
        color: 'purple',
        group: 'presence',
        contentComponent: 'RoomsPanelContent',
    },
    // COMMUNICATION
    {
        id: 'chat',
        icon: 'messageSquare',
        label: 'Chat',
        color: 'blue',
        group: 'communication',
        contentComponent: 'ChatPanelContent',
    },
    {
        id: 'activity',
        icon: 'browse_activity',
        label: 'Activity',
        color: 'amber',
        group: 'communication',
        contentComponent: 'ActivityPanelContent',
    },
    // DOCUMENTATION
    {
        id: 'notes',
        icon: 'file',
        label: 'Notes',
        color: 'teal',
        group: 'documentation',
        contentComponent: 'NotesPanelContent',
    },
    {
        id: 'recording',
        icon: 'video',
        label: 'Recording',
        color: 'red',
        group: 'documentation',
        contentComponent: 'RecordingsPanelContent',
    },
    {
        id: 'analysis',
        icon: 'folderTree',
        label: 'Analysis Flow',
        color: 'amber',
        group: 'analysis',
        contentComponent: 'AnalysisPanelContent',
    },
    // SETTINGS
    {
        id: 'settings',
        icon: 'settings',
        label: 'Settings',
        color: 'indigo',
        group: 'settings',
        contentComponent: 'SettingsPanelContent',
    },
];

/**
 * Dividers appear after these tabs (per spec)
 */
export const RIGHT_PANEL_DIVIDERS_AFTER = ['rooms', 'activity', 'recording'];

// =============================================================================
// TAB CONTENT REGISTRY
// =============================================================================

/**
 * Registry of tab content components.
 * This allows centralized tab rendering without duplicating switch statements.
 */
const TAB_COMPONENT_REGISTRY = new Map();

/**
 * Register a tab content component
 * 
 * @param {string} tabId - Tab identifier (e.g., 'people', 'chat')
 * @param {React.ComponentType} Component - The content component to render
 */
export function registerRightPanelTab(tabId, Component) {
    TAB_COMPONENT_REGISTRY.set(tabId, Component);
}

/**
 * Get a registered tab content component
 * 
 * @param {string} tabId - Tab identifier
 * @returns {React.ComponentType|null} The registered component or null
 */
export function getRightPanelTabComponent(tabId) {
    return TAB_COMPONENT_REGISTRY.get(tabId) || null;
}

/**
 * Check if a tab has a registered component
 * 
 * @param {string} tabId - Tab identifier
 * @returns {boolean} Whether the tab has a registered component
 */
export function isRightPanelTabRegistered(tabId) {
    return TAB_COMPONENT_REGISTRY.has(tabId);
}

// =============================================================================
// PLACEHOLDER COMPONENT
// =============================================================================

/**
 * PlaceholderContent - Shown for tabs without registered components
 */
function PlaceholderContent({ tabId }) {
    const tab = RIGHT_PANEL_TABS.find(t => t.id === tabId);
    const iconName = tab?.icon;

    return (
        <div className="right-panel__placeholder">
            {iconName && (
                <div className="right-panel__placeholder-icon" data-color={tab?.color}>
                    <Icon name={iconName} size={32} />
                </div>
            )}
            <div className="right-panel__placeholder-title">
                {tab?.label || 'Unknown'}
            </div>
            <div className="right-panel__placeholder-text">
                This panel is coming soon
            </div>
        </div>
    );
}

// =============================================================================
// CENTRALIZED TAB CONTENT RENDERER
// =============================================================================

/**
 * Render content for a specific tab.
 * This is the SINGLE function all consumers should use.
 * 
 * @param {string} tabId - Tab identifier
 * @param {Object} props - Props to pass to the content component
 * @param {string} props.workspaceId - Current workspace ID
 * @param {string} [props.roomId] - Current room ID
 * @param {string} [props.roomName] - Current room name
 * @param {string} [props.projectId] - Project ID (for settings)
 * @returns {React.ReactElement} The rendered tab content
 * 
 * @example
 * // In RightPanelContent.jsx:
 * import { renderRightPanelTabContent } from './RightPanelContext';
 * return renderRightPanelTabContent(activeTab, { workspaceId, roomId, roomName });
 */
export function renderRightPanelTabContent(tabId, props = {}) {
    const Component = TAB_COMPONENT_REGISTRY.get(tabId);

    if (!Component) {
        return <PlaceholderContent tabId={tabId} />;
    }

    return <Component {...props} />;
}

// =============================================================================
// CONTEXT
// =============================================================================

/**
 * Context shape
 */
const RightPanelContext = createContext({
    activeTab: 'people',
    setActiveTab: () => { },
    navigateToPanel: () => { },
});

// =============================================================================
// PROVIDER
// =============================================================================

// LocalStorage key for right panel tab
const RIGHT_PANEL_TAB_STORAGE_KEY = 'ciaRightPanelTab';

/**
 * Load saved right panel tab from localStorage
 */
function loadRightPanelTab(defaultTab) {
    try {
        const saved = localStorage.getItem(RIGHT_PANEL_TAB_STORAGE_KEY);
        if (saved && RIGHT_PANEL_TABS.some(t => t.id === saved)) {
            return saved;
        }
    } catch (error) {
        console.warn('Failed to load right panel tab:', error);
    }
    return defaultTab;
}

/**
 * Save right panel tab to localStorage
 */
function saveRightPanelTab(tabId) {
    try {
        localStorage.setItem(RIGHT_PANEL_TAB_STORAGE_KEY, tabId);
    } catch (error) {
        console.warn('Failed to save right panel tab:', error);
    }
}

/**
 * RightPanelProvider - Wraps the app to provide shared state
 *
 * @example
 * <RightPanelProvider>
 *   <ThreeEdgeLayout
 *     rightActivityBar={<RightActivityBar />}
 *     rightContent={<RightPanelContent />}
 *   />
 * </RightPanelProvider>
 */
export function RightPanelProvider({ children, defaultTab = 'people' }) {
    const [activeTab, setActiveTab] = useState(() => loadRightPanelTab(defaultTab));

    // Navigate to a specific panel/tab
    const navigateToPanel = useCallback((panelId) => {
        const tab = RIGHT_PANEL_TABS.find((t) => t.id === panelId);
        if (tab) {
            setActiveTab(panelId);
        }
    }, []);

    // Save tab to localStorage when it changes
    useEffect(() => {
        saveRightPanelTab(activeTab);
    }, [activeTab]);

    // Dispatch tab change events for other components
    // (useful for tracking, analytics, or external integrations)
    const handleSetActiveTab = useCallback((tabId) => {
        setActiveTab(tabId);
        window.dispatchEvent(
            new CustomEvent('cia:right-panel-tab-change', {
                detail: { tabId },
            })
        );
    }, []);

    const value = {
        activeTab,
        setActiveTab: handleSetActiveTab,
        navigateToPanel,
    };

    return (
        <RightPanelContext.Provider value={value}>
            {children}
        </RightPanelContext.Provider>
    );
}

/**
 * Hook to access right panel state
 *
 * @example
 * const { activeTab, setActiveTab, navigateToPanel } = useRightPanelContext();
 */
export function useRightPanelContext() {
    const context = useContext(RightPanelContext);
    if (!context) {
        throw new Error(
            'useRightPanelContext must be used within a RightPanelProvider'
        );
    }
    return context;
}

export default RightPanelContext;
