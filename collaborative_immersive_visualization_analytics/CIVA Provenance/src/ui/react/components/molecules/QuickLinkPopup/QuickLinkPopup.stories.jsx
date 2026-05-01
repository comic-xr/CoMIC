// src/ui/react/components/molecules/QuickLinkPopup/QuickLinkPopup.stories.jsx
// Stories for QuickLinkPopup component

import React, { useState } from 'react';
import { QuickLinkPopup } from './QuickLinkPopup';

export default {
    title: 'Molecules/QuickLinkPopup',
    component: QuickLinkPopup,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
    },
};

const sampleSourceView = {
    id: 'v1',
    name: 'View of Skull.vtp',
    color: '#2dd4bf',
};

const sampleTargetView = {
    id: 'v2',
    name: 'View of Bones.vtp',
    color: '#a78bfa',
};

export const Default = () => {
    const [result, setResult] = useState(null);

    return (
        <div style={{ position: 'relative', width: '600px', height: '500px' }}>
            <QuickLinkPopup
                sourceView={sampleSourceView}
                targetView={sampleTargetView}
                position={{ x: 100, y: 50 }}
                onConfirm={(properties, mode) => {
                    setResult({ properties, mode });
                    console.log('Link created:', { properties, mode });
                }}
                onCancel={() => console.log('Cancelled')}
            />

            {result && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        padding: '16px',
                        background: 'rgba(0,0,0,0.8)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#fff',
                    }}
                >
                    <strong>Link Created:</strong>
                    <br />
                    Properties: {result.properties.join(', ')}
                    <br />
                    Mode: {result.mode}
                </div>
            )}
        </div>
    );
};

export const LongViewNames = () => (
    <div style={{ position: 'relative', width: '600px', height: '500px' }}>
        <QuickLinkPopup
            sourceView={{
                id: 'v1',
                name: 'Very Long View Name That Should Be Truncated',
                color: '#60a5fa',
            }}
            targetView={{
                id: 'v2',
                name: 'Another Extremely Long View Name Here',
                color: '#f472b6',
            }}
            position={{ x: 100, y: 50 }}
            onConfirm={(props, mode) => console.log('Confirm:', props, mode)}
            onCancel={() => console.log('Cancel')}
        />
    </div>
);

export const Interactive = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [lastLink, setLastLink] = useState(null);

    return (
        <div style={{ padding: '20px' }}>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: '8px 16px',
                    background: '#2dd4bf',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: '20px',
                }}
            >
                Open Popup
            </button>

            {lastLink && (
                <div
                    style={{
                        padding: '12px',
                        background: 'rgba(45, 212, 191, 0.1)',
                        border: '1px solid #2dd4bf',
                        borderRadius: '6px',
                        marginBottom: '20px',
                        fontSize: '12px',
                        color: '#fff',
                    }}
                >
                    <strong>Last Link:</strong> {lastLink.properties.join(', ')} ({lastLink.mode})
                </div>
            )}

            {isOpen && (
                <div style={{ position: 'relative', width: '600px', height: '400px' }}>
                    <QuickLinkPopup
                        sourceView={sampleSourceView}
                        targetView={sampleTargetView}
                        position={{ x: 100, y: 50 }}
                        onConfirm={(properties, mode) => {
                            setLastLink({ properties, mode });
                            setIsOpen(false);
                        }}
                        onCancel={() => setIsOpen(false)}
                    />
                </div>
            )}
        </div>
    );
};
