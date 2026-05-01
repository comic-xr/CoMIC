/**
 * @file LeftPanelContext.jsx
 * @description Shared state and tab registry for Left Panel.
 * SINGLE SOURCE OF TRUTH for tab configuration and rendering.
 *
 * Tab Order (per spec):
 * 1. Files (blue) - DATA SOURCES
 * 2. Datasets (teal) - DATA SOURCES
 * --- divider ---
 * 3. Views (purple) - VISUALIZATION
 * 4. Instance Tools (amber) - VISUALIZATION
 * 5. Layout (green) - VISUALIZATION
 * --- divider ---
 * 6. Annotations (pink) - SPATIAL & STATE
 * 7. Bookmarks & Filters (indigo) - SPATIAL & STATE
 * --- divider ---
 * 8. Cursors (cyan) - PRESENCE
 *
 * @see Left_Panel_Design_Specification.docx - Section 2 Tab Structure
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// =============================================================================
// TAB CONTENT COMPONENTS - Lazy imports to avoid circular dependencies
// =============================================================================

// These will be dynamically imported by the registry
// Components are imported where renderTabContent is called

// =============================================================================
// TAB CONFIGURATION - Per Left_Panel_Design_Specification.docx
// =============================================================================

/**
 * Tab definitions matching specification Section 2
 * This is the SINGLE SOURCE OF TRUTH for left panel tabs.
 */
export const LEFT_PANEL_TABS = [
    // DATA SOURCES
    {
        id: 'files',
        icon: 'folderOpen',
        label: 'Files',
        color: 'blue',
        group: 'data',
        contentComponent: 'FilesPanelContent',
    },
    {
        id: 'datasets',
        icon: 'database',
        label: 'Datasets',
        color: 'teal',
        group: 'data',
        contentComponent: 'DatasetsPanelContent',
    },
    // VISUALIZATION
    // {
    //     id: 'views',
    //     icon: 'eye',
    //     label: 'Views',
    //     color: 'purple',
    //     group: 'visualization',
    //     contentComponent: 'ViewsPanelContent',
    // },
    {
        id: 'layout',
        icon: 'layoutGrid',
        label: 'Layout',
        color: 'green',
        group: 'visualization',
        contentComponent: 'LayoutPanelContent',
    },
    {
        id: 'navigator',
        icon: 'compass',
        label: 'Navigator',
        color: 'teal',
        group: 'visualization',
        contentComponent: 'NavigatorPanelContent',
    },
    {
        id: 'tools',
        icon: 'wrench',
        label: 'Instance Tools',
        color: 'amber',
        group: 'visualization',
        contentComponent: 'InstanceToolsPanelContent',
    },
    // SPATIAL & STATE
    {
        id: 'annotations',
        icon: 'mapPin',
        label: 'Annotations',
        color: 'pink',
        group: 'spatial',
        contentComponent: 'AnnotationsPanelContent',
    },
    {
        id: 'bookmarks',
        icon: 'bookmark',
        label: 'Bookmarks & Filters',
        color: 'indigo',
        group: 'spatial',
        contentComponent: 'BookmarksFiltersPanelContent',
    },
    // PRESENCE (future VR expansion)
    {
        id: 'cursors',
        icon: 'mousePointer',
        label: 'Cursors',
        color: 'cyan',
        group: 'presence',
        contentComponent: 'CursorsPanelContent',
    },
    // NOTE: Canvas Map has been migrated to CanvasMapPanel (PanelShell floating panel)
    // Use: import { CanvasMapPanel } from '@UI/react/components/panels/CanvasMapPanel';
];

/**
 * Dividers appear after these tabs (per spec Section 2)
 */
export const LEFT_PANEL_DIVIDERS_AFTER = ['datasets', 'navigator', 'bookmarks'];

/**
 * Keyboard shortcuts for tabs (per spec Section 13)
 * Note: Canvas Map (m) shortcut should be handled by PanelShell for CanvasMapPanel
 */
export const LEFT_PANEL_SHORTCUTS = {
    f: 'files',
    d: 'datasets',
    v: 'views',
    i: 'tools',
    l: 'layout',
    n: 'navigator',
    a: 'annotations',
    'shift+b': 'bookmarks',
    c: 'cursors',
    // m: 'canvasmap' - migrated to CanvasMapPanel (PanelShell)
};

// =============================================================================
// TAB CONTENT REGISTRY
// =============================================================================

/**
 * Registry of tab content components.
 * This allows centralized tab rendering without duplicating switch statements.
 * 
 * Components are registered here to break circular import dependencies.
 * Each component must be registered before it can be rendered.
 */
const TAB_COMPONENT_REGISTRY = new Map();

/**
 * Register a tab content component
 * Call this from each tab's index.jsx to register its content component
 * 
 * @param {string} tabId - Tab identifier (e.g., 'files', 'datasets')
 * @param {React.ComponentType} Component - The content component to render
 * 
 * @example
 * // In FilesTab/index.jsx:
 * import { registerLeftPanelTab } from '../LeftPanelContext';
 * registerLeftPanelTab('files', FilesPanelContent);
 */
export function registerLeftPanelTab(tabId, Component) {
    TAB_COMPONENT_REGISTRY.set(tabId, Component);
}

/**
 * Get a registered tab content component
 * 
 * @param {string} tabId - Tab identifier
 * @returns {React.ComponentType|null} The registered component or null
 */
export function getLeftPanelTabComponent(tabId) {
    return TAB_COMPONENT_REGISTRY.get(tabId) || null;
}

/**
 * Check if a tab has a registered component
 * 
 * @param {string} tabId - Tab identifier
 * @returns {boolean} Whether the tab has a registered component
 */
export function isLeftPanelTabRegistered(tabId) {
    return TAB_COMPONENT_REGISTRY.has(tabId);
}

// =============================================================================
// PLACEHOLDER COMPONENT
// =============================================================================

/**
 * PlaceholderContent - Shown for tabs without registered components
 */
function PlaceholderContent({ tabId }) {
    const tab = LEFT_PANEL_TABS.find(t => t.id === tabId) || LEFT_PANEL_TABS[0];
    const iconName = tab.icon;

    return (
        <div className="left-panel__placeholder">
            <Icon name={iconName} size={32} className="left-panel__placeholder-icon" data-color={tab.color} />
            <h3 className="left-panel__placeholder-title">{tab.label}</h3>
            <p className="left-panel__placeholder-text">
                This tab is coming soon. It will contain {tab.label.toLowerCase()} management features.
            </p>
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
 * @param {Function} [props.onNavigateToPanel] - Navigation callback for cross-panel links
 * @returns {React.ReactElement} The rendered tab content
 * 
 * @example
 * // In LeftPanelContent.jsx:
 * import { renderLeftPanelTabContent } from './LeftPanelContext';
 * return renderLeftPanelTabContent(activeTab, { workspaceId, onNavigateToPanel: navigateToPanel });
 */
export function renderLeftPanelTabContent(tabId, props = {}) {
    const Component = TAB_COMPONENT_REGISTRY.get(tabId);

    if (!Component) {
        return <PlaceholderContent tabId={tabId} />;
    }

    return <Component {...props} />;
}

// =============================================================================
// CONTEXT
// =============================================================================

const LeftPanelContext = createContext({
    activeTab: 'files',
    setActiveTab: () => { },
    navigateToPanel: () => { },
});

// =============================================================================
// PROVIDER
// =============================================================================

// LocalStorage key for left panel tab
const LEFT_PANEL_TAB_STORAGE_KEY = 'ciaLeftPanelTab';

/**
 * Load saved left panel tab from localStorage
 */
function loadLeftPanelTab(defaultTab) {
    try {
        const saved = localStorage.getItem(LEFT_PANEL_TAB_STORAGE_KEY);
        if (saved && LEFT_PANEL_TABS.some(t => t.id === saved)) {
            return saved;
        }
    } catch (error) {
        console.warn('Failed to load left panel tab:', error);
    }
    return defaultTab;
}

/**
 * Save left panel tab to localStorage
 */
function saveLeftPanelTab(tabId) {
    try {
        localStorage.setItem(LEFT_PANEL_TAB_STORAGE_KEY, tabId);
    } catch (error) {
        console.warn('Failed to save left panel tab:', error);
    }
}

/**
 * LeftPanelProvider - Provides shared state for Left Panel
 */
export function LeftPanelProvider({ children, defaultTab = 'files' }) {
    const [activeTab, setActiveTab] = useState(() => loadLeftPanelTab(defaultTab));

    // Navigate to a specific panel/tab
    const navigateToPanel = useCallback((panelId) => {
        const tab = LEFT_PANEL_TABS.find((t) => t.id === panelId);
        if (tab) {
            setActiveTab(panelId);
        }
    }, []);

    // Save tab to localStorage and dispatch event when it changes
    useEffect(() => {
        saveLeftPanelTab(activeTab);
        window.dispatchEvent(
            new CustomEvent('cia:left-panel-tab-change', {
                detail: { tabId: activeTab, isInstanceToolsActive: activeTab === 'tools' },
            })
        );
    }, [activeTab]);

    // Listen for instance tools open event - DOCKED version only
    // The floating panel (InstanceToolsFloating) handles 'cia:open-instance-tools'
    // This listener handles 'cia:open-instance-tools-docked' for explicit docked panel requests
    useEffect(() => {
        const handleOpenInstanceToolsDocked = () => {
            setActiveTab('tools');
        };

        window.addEventListener('cia:open-instance-tools-docked', handleOpenInstanceToolsDocked);
        return () => {
            window.removeEventListener('cia:open-instance-tools-docked', handleOpenInstanceToolsDocked);
        };
    }, []);

    useEffect(() => {
        const handleNavigateToPanel = (event) => {
            const panelId = event?.detail?.panelId;
            if (LEFT_PANEL_TABS.some((tab) => tab.id === panelId)) {
                setActiveTab(panelId);
            }
        };

        window.addEventListener('cia:navigate-to-panel', handleNavigateToPanel);
        return () => {
            window.removeEventListener('cia:navigate-to-panel', handleNavigateToPanel);
        };
    }, []);

    // Keyboard shortcut handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.shiftKey
                ? `shift+${e.key.toLowerCase()}`
                : e.key.toLowerCase();
            const tabId = LEFT_PANEL_SHORTCUTS[key];

            if (tabId) {
                e.preventDefault();
                setActiveTab(tabId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const value = {
        activeTab,
        setActiveTab,
        navigateToPanel,
    };

    return (
        <LeftPanelContext.Provider value={value}>
            {children}
        </LeftPanelContext.Provider>
    );
}

/**
 * Hook to access left panel state
 *
 * @example
 * const { activeTab, setActiveTab, navigateToPanel } = useLeftPanelContext();
 */
export function useLeftPanelContext() {
    const context = useContext(LeftPanelContext);
    if (!context) {
        throw new Error(
            'useLeftPanelContext must be used within a LeftPanelProvider'
        );
    }
    return context;
}

export default LeftPanelContext;
