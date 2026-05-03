// src/ui/react/components/molecules/CameraGrid/CameraGrid.stories.jsx
import React from 'react';

// Mock CameraGrid for Storybook since it may have complex dependencies
const MockCameraGrid = ({ columns = 2, children }) => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '8px',
        padding: '8px',
        background: '#1a1a2e',
        borderRadius: '8px',
    }}>
        {children || (
            <>
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            aspectRatio: '16/9',
                            background: '#2d2d4a',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            fontSize: '12px',
                        }}
                    >
                        Camera {i + 1}
                    </div>
                ))}
            </>
        )}
    </div>
);

export default {
    title: 'Molecules/CameraGrid',
    component: MockCameraGrid,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        columns: {
            control: { type: 'number', min: 1, max: 4 },
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '400px' }}>
                <Story />
            </div>
        ),
    ],
};

export const TwoColumns = {
    args: {
        columns: 2,
    },
};

export const ThreeColumns = {
    args: {
        columns: 3,
    },
};

export const SingleColumn = {
    args: {
        columns: 1,
    },
};

export const WithLabels = {
    render: () => (
        <MockCameraGrid columns={2}>
            {['Front', 'Back', 'Left', 'Right'].map((label) => (
                <div
                    key={label}
                    style={{
                        aspectRatio: '16/9',
                        background: '#2d2d4a',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#e5e7eb',
                        fontSize: '12px',
                        position: 'relative',
                    }}
                >
                    <span style={{ opacity: 0.5 }}>📷</span>
                    <span style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '8px',
                        fontSize: '10px',
                        color: '#9ca3af',
                    }}>
                        {label}
                    </span>
                </div>
            ))}
        </MockCameraGrid>
    ),
};

export const ActiveCamera = {
    render: () => (
        <MockCameraGrid columns={2}>
            {[0, 1, 2, 3].map((i) => (
                <div
                    key={i}
                    style={{
                        aspectRatio: '16/9',
                        background: i === 0 ? '#1e3a5f' : '#2d2d4a',
                        borderRadius: '4px',
                        border: i === 0 ? '2px solid #3b82f6' : '1px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: i === 0 ? '#3b82f6' : '#6b7280',
                        fontSize: '12px',
                    }}
                >
                    Camera {i + 1}
                </div>
            ))}
        </MockCameraGrid>
    ),
};
