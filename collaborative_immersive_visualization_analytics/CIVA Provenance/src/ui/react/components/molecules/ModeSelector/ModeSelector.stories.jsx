/**
 * ModeSelector Stories
 */

import React, { useState } from 'react';
import { ModeSelector } from './ModeSelector';

export default {
    title: 'Molecules/ModeSelector',
    component: ModeSelector,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'Three-way toggle for selecting link direction: Follow (receive only), Sync (two-way), or Broadcast (send only).',
            },
        },
    },
};

export const Default = () => {
    const [mode, setMode] = useState('sync');

    return (
        <div style={{ width: 400, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <ModeSelector
                currentMode={mode}
                onChange={setMode}
            />
        </div>
    );
};

export const FollowMode = () => {
    const [mode, setMode] = useState('follow');

    return (
        <div style={{ width: 400, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <ModeSelector
                currentMode={mode}
                onChange={setMode}
            />
        </div>
    );
};

export const BroadcastMode = () => {
    const [mode, setMode] = useState('broadcast');

    return (
        <div style={{ width: 400, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <ModeSelector
                currentMode={mode}
                onChange={setMode}
            />
        </div>
    );
};

export const CustomColor = () => {
    const [mode, setMode] = useState('sync');

    return (
        <div style={{ width: 400, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <ModeSelector
                currentMode={mode}
                onChange={setMode}
                color="#a78bfa"
            />
        </div>
    );
};

export const CustomLabel = () => {
    const [mode, setMode] = useState('sync');

    return (
        <div style={{ width: 400, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <ModeSelector
                currentMode={mode}
                onChange={setMode}
                label="Link Direction"
            />
        </div>
    );
};
