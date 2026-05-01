// src/ui/react/__mocks__/MockDataProvider.jsx
// React context provider for mock data mode in Storybook
//
// Wrap components in this provider to make hooks return mock data
// instead of trying to fetch from backend.
//
// Usage in stories:
//   import { MockDataProvider } from '@UI/react/__mocks__/MockDataProvider';
//   
//   export const MyStory = {
//     decorators: [(Story) => <MockDataProvider><Story /></MockDataProvider>],
//   };

import React, { createContext, useContext, useMemo } from 'react';

// Import mock hooks
import { useMockProjectFiles } from './hooks/useProjectFiles.mock.js';
import {
    useMockDatasets,
    useMockDatasetActions,
    useMockViewConfigurations
} from './hooks/useDatasets.mock.js';
import { useMockComputeJobs } from './hooks/useComputeJobs.mock.js';
import { useMockRooms } from './hooks/useRooms.mock.js';
import { useMockAnnotations } from './hooks/useAnnotations.mock.js';
import { useMockBookmarks } from './hooks/useBookmarks.mock.js';
import { useMockFilters } from './hooks/useFilters.mock.js';
import { useMockWorkspaces } from './hooks/useWorkspaces.mock.js';

// =============================================================================
// CONTEXT
// =============================================================================

/**
 * Context for mock data mode
 */
const MockDataContext = createContext({
    isMockMode: false,
    mockHooks: {},
});

/**
 * Hook to check if we're in mock mode
 */
export function useMockDataMode() {
    return useContext(MockDataContext);
}

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * MockDataProvider - Enables mock data mode for child components
 * 
 * When wrapped in this provider, components can use useMockDataMode()
 * to check if they should return mock data.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.workspaceId - Optional workspace ID for context
 * @param {string} props.datasetId - Optional dataset ID for filtering
 */
export function MockDataProvider({
    children,
    workspaceId = 'ws-personal',
    datasetId = null
}) {
    // Build mock hooks object
    const mockHooks = useMemo(() => ({
        // File hooks
        useProjectFiles: useMockProjectFiles,

        // Dataset hooks
        useDatasets: useMockDatasets,
        useDatasetActions: useMockDatasetActions,
        useViewConfigurations: (dsId) => useMockViewConfigurations(dsId || datasetId),

        // Compute hooks
        useComputeJobs: useMockComputeJobs,

        // Collaboration hooks
        useRooms: useMockRooms,

        // Annotation hooks
        useAnnotations: (dsId) => useMockAnnotations(dsId || datasetId),

        // Bookmark hooks
        useBookmarks: (options) => useMockBookmarks({ ...options, datasetId }),

        // Filter hooks
        useFilters: useMockFilters,

        // Workspace hooks
        useWorkspaces: useMockWorkspaces,
    }), [datasetId]);

    const contextValue = useMemo(() => ({
        isMockMode: true,
        mockHooks,
        workspaceId,
        datasetId,
    }), [mockHooks, workspaceId, datasetId]);

    return (
        <MockDataContext.Provider value={contextValue}>
            {children}
        </MockDataContext.Provider>
    );
}

// =============================================================================
// HOOK WRAPPER UTILITIES
// =============================================================================

/**
 * Create a hook that uses mock data when in MockDataProvider
 * 
 * Usage:
 *   const useDatasets = createMockableHook(
 *     realUseDatasets,
 *     'useDatasets'
 *   );
 * 
 * @param {Function} realHook - The real hook implementation
 * @param {string} hookName - Name of the hook in mockHooks
 * @returns {Function} - A hook that switches between real and mock
 */
export function createMockableHook(realHook, hookName) {
    return function useMockableHook(...args) {
        const { isMockMode, mockHooks } = useMockDataMode();

        if (isMockMode && mockHooks[hookName]) {
            return mockHooks[hookName](...args);
        }

        return realHook(...args);
    };
}

/**
 * HOC to wrap a component with MockDataProvider for stories
 * 
 * Usage in stories:
 *   export const MyStory = {
 *     decorators: [withMockData({ datasetId: 'ds-brain-scan' })],
 *   };
 */
export function withMockData(options = {}) {
    return (Story) => (
        <MockDataProvider {...options}>
            <Story />
        </MockDataProvider>
    );
}