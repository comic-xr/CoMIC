import React from 'react';
import { render } from '@testing-library/react';

// Mock adaptive context values for desktop mode
const mockDesktopTokens = {
    buttonHeight: 32,
    iconSize: 16,
    fontSize: 13,
    gap: 8,
    padding: 12,
};

// Mock adaptive context values for VR mode
const mockVRTokens = {
    buttonHeight: 48,
    iconSize: 24,
    fontSize: 16,
    gap: 12,
    padding: 16,
};

// Mock AdaptiveContext
const MockAdaptiveContext = React.createContext({
    mode: 'desktop',
    tokens: mockDesktopTokens,
});

// Mock useAdaptive hook
export const mockUseAdaptive = (mode = 'desktop') => ({
    mode,
    tokens: mode === 'vr' ? mockVRTokens : mockDesktopTokens,
});

// Wrapper component that provides mock context
export const TestWrapper = ({ children, mode = 'desktop' }) => {
    const value = mockUseAdaptive(mode);
    return (
        <MockAdaptiveContext.Provider value={value}>
            {children}
        </MockAdaptiveContext.Provider>
    );
};

// Custom render function with providers
export const renderWithProviders = (ui, { mode = 'desktop', ...options } = {}) => {
    const Wrapper = ({ children }) => (
        <TestWrapper mode={mode}>{children}</TestWrapper>
    );
    return render(ui, { wrapper: Wrapper, ...options });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };
