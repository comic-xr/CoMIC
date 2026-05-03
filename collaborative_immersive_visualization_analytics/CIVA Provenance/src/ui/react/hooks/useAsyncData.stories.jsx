// src/ui/react/hooks/useAsyncData.stories.jsx
// Storybook stories for useAsyncData and useWebSocketEvents hooks
//
// These stories demonstrate:
// - Basic data fetching with loading/error states
// - Refetch functionality
// - WebSocket event integration
// - Mutation patterns
// - Retry behavior

import React, { useState } from 'react';
import { useAsyncData, useAsyncMutation } from './useAsyncData';
import {
    useWebSocketEvents,
    useServerSyncEvents,
    dispatchMockWSEvent
} from './useWebSocketEvents';

export default {
    title: 'Hooks/useAsyncData',
    parameters: {
        docs: {
            description: {
                component: `
## useAsyncData

A generic hook for async data fetching that handles:
- Loading and error states
- Automatic abort on unmount
- Refetch capability
- Retry on failure
- Window focus refetching

### Usage

\`\`\`jsx
const { data, isLoading, error, refetch } = useAsyncData(
  async (signal) => {
    const res = await fetch('/api/items', { signal });
    return res.json();
  },
  [dependency]
);
\`\`\`
        `,
            },
        },
    },
};

// =============================================================================
// MOCK API
// =============================================================================

const mockItems = [
    { id: '1', name: 'Dataset Alpha', size: '2.4 MB' },
    { id: '2', name: 'Dataset Beta', size: '1.8 MB' },
    { id: '3', name: 'Dataset Gamma', size: '5.2 MB' },
];

// Simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock fetch function
const mockFetch = async (signal, { shouldFail = false, delayMs = 800 } = {}) => {
    await delay(delayMs);

    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    if (shouldFail) {
        throw new Error('Network error: Failed to fetch');
    }

    return [...mockItems];
};

// =============================================================================
// STORY COMPONENTS
// =============================================================================

/**
 * Basic usage - demonstrates loading, success, and error states
 */
export const BasicUsage = () => {
    const [shouldFail, setShouldFail] = useState(false);

    const { data, isLoading, error, isSuccess, refetch } = useAsyncData(
        async (signal) => mockFetch(signal, { shouldFail }),
        [shouldFail],
        {
            onSuccess: (data) => console.log('Fetched:', data.length, 'items'),
            onError: (err) => console.log('Error:', err.message),
        }
    );

    return (
        <div style={{ padding: 20, fontFamily: 'system-ui' }}>
            <h3>Basic useAsyncData Demo</h3>

            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                <button onClick={() => refetch()}>
                    Refetch
                </button>
                <button onClick={() => setShouldFail(f => !f)}>
                    {shouldFail ? 'Enable Success' : 'Enable Failure'}
                </button>
            </div>

            <div style={{
                padding: 16,
                background: '#1a1a2e',
                borderRadius: 8,
                color: '#eee',
                minHeight: 150,
            }}>
                {isLoading && (
                    <div style={{ color: '#60a5fa' }}>
                        ⏳ Loading...
                    </div>
                )}

                {error && (
                    <div style={{ color: '#f87171' }}>
                        ❌ Error: {error}
                    </div>
                )}

                {isSuccess && (
                    <div>
                        <div style={{ color: '#4ade80', marginBottom: 8 }}>
                            ✅ Loaded {data.length} items
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {data.map(item => (
                                <li key={item.id}>
                                    {item.name} ({item.size})
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div style={{ marginTop: 16, fontSize: 12, color: '#888' }}>
                <strong>State:</strong>{' '}
                isLoading={String(isLoading)},
                isSuccess={String(isSuccess)},
                error={error || 'null'}
            </div>
        </div>
    );
};

/**
 * With retry - demonstrates automatic retry on failure
 */
export const WithRetry = () => {
    const [attemptCount, setAttemptCount] = useState(0);

    // This will fail twice then succeed
    const fetchWithRetry = async (signal) => {
        setAttemptCount(c => c + 1);
        await delay(500);

        if (attemptCount < 2) {
            throw new Error(`Attempt ${attemptCount + 1} failed`);
        }

        return mockItems;
    };

    const { data, isLoading, error, refetch } = useAsyncData(
        fetchWithRetry,
        [],
        {
            retryCount: 3,
            retryDelay: 1000,
        }
    );

    return (
        <div style={{ padding: 20, fontFamily: 'system-ui' }}>
            <h3>Retry Demo (fails twice, then succeeds)</h3>

            <button
                onClick={() => { setAttemptCount(0); refetch(); }}
                style={{ marginBottom: 16 }}
            >
                Reset & Refetch
            </button>

            <div style={{
                padding: 16,
                background: '#1a1a2e',
                borderRadius: 8,
                color: '#eee',
            }}>
                <div style={{ marginBottom: 8 }}>
                    Attempt count: <strong>{attemptCount}</strong>
                </div>

                {isLoading && <div style={{ color: '#60a5fa' }}>⏳ Loading (retrying...)...</div>}
                {error && <div style={{ color: '#f87171' }}>❌ {error}</div>}
                {data && <div style={{ color: '#4ade80' }}>✅ Success after {attemptCount} attempts!</div>}
            </div>
        </div>
    );
};

/**
 * With WebSocket Events - demonstrates real-time updates
 */
export const WithWebSocketEvents = () => {
    const [items, setItems] = useState(mockItems);

    // Simulate initial fetch
    const { isLoading, refetch } = useAsyncData(
        async () => {
            await delay(500);
            return mockItems;
        },
        [],
        {
            onSuccess: setItems,
        }
    );

    // Subscribe to WebSocket events
    useServerSyncEvents('item', {
        onCreate: (detail) => {
            console.log('Item created:', detail);
            setItems(prev => [...prev, detail]);
        },
        onUpdate: (detail) => {
            console.log('Item updated:', detail);
            setItems(prev => prev.map(i => i.id === detail.id ? detail : i));
        },
        onDelete: (detail) => {
            console.log('Item deleted:', detail);
            setItems(prev => prev.filter(i => i.id !== detail.itemId));
        },
    });

    // Functions to simulate WebSocket events
    const simulateCreate = () => {
        const newItem = {
            id: String(Date.now()),
            name: `New Dataset ${Math.random().toString(36).slice(2, 6)}`,
            size: `${(Math.random() * 10).toFixed(1)} MB`,
        };
        dispatchMockWSEvent('ws:item:created', newItem);
    };

    const simulateUpdate = () => {
        if (items.length === 0) return;
        const item = items[0];
        dispatchMockWSEvent('ws:item:updated', {
            ...item,
            name: `${item.name} (updated)`,
        });
    };

    const simulateDelete = () => {
        if (items.length === 0) return;
        dispatchMockWSEvent('ws:item:deleted', { itemId: items[0].id });
    };

    return (
        <div style={{ padding: 20, fontFamily: 'system-ui' }}>
            <h3>WebSocket Events Demo</h3>

            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={simulateCreate}>➕ Simulate Create</button>
                <button onClick={simulateUpdate}>✏️ Simulate Update</button>
                <button onClick={simulateDelete}>🗑️ Simulate Delete</button>
                <button onClick={refetch}>🔄 Refetch All</button>
            </div>

            <div style={{
                padding: 16,
                background: '#1a1a2e',
                borderRadius: 8,
                color: '#eee',
                minHeight: 150,
            }}>
                {isLoading ? (
                    <div style={{ color: '#60a5fa' }}>⏳ Loading...</div>
                ) : (
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {items.map(item => (
                            <li key={item.id} style={{ marginBottom: 4 }}>
                                {item.name} ({item.size})
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div style={{ marginTop: 16, fontSize: 12, color: '#888' }}>
                Open browser console to see WebSocket event logs
            </div>
        </div>
    );
};

/**
 * Mutation Example - demonstrates useAsyncMutation for create/update/delete
 */
export const MutationExample = () => {
    const [items, setItems] = useState(mockItems);
    const [newName, setNewName] = useState('');

    const { mutate: createItem, isLoading: isCreating, error: createError } = useAsyncMutation(
        async (name) => {
            await delay(800);
            const newItem = {
                id: String(Date.now()),
                name,
                size: `${(Math.random() * 10).toFixed(1)} MB`,
            };
            return newItem;
        },
        {
            onSuccess: (newItem) => {
                setItems(prev => [...prev, newItem]);
                setNewName('');
            },
        }
    );

    const { mutate: deleteItem, isLoading: isDeleting } = useAsyncMutation(
        async (id) => {
            await delay(500);
            return id;
        },
        {
            onSuccess: (id) => {
                setItems(prev => prev.filter(i => i.id !== id));
            },
        }
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newName.trim()) {
            createItem(newName.trim());
        }
    };

    return (
        <div style={{ padding: 20, fontFamily: 'system-ui' }}>
            <h3>Mutation Demo</h3>

            <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New dataset name..."
                    style={{ marginRight: 8, padding: '4px 8px' }}
                />
                <button type="submit" disabled={isCreating || !newName.trim()}>
                    {isCreating ? 'Creating...' : 'Create'}
                </button>
            </form>

            {createError && (
                <div style={{ color: '#f87171', marginBottom: 8 }}>
                    Error: {createError}
                </div>
            )}

            <div style={{
                padding: 16,
                background: '#1a1a2e',
                borderRadius: 8,
                color: '#eee',
            }}>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {items.map(item => (
                        <li
                            key={item.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: '1px solid #333',
                            }}
                        >
                            <span>{item.name} ({item.size})</span>
                            <button
                                onClick={() => deleteItem(item.id)}
                                disabled={isDeleting}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #666',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                }}
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

/**
 * Conditional Fetching - demonstrates the `enabled` option
 */
export const ConditionalFetching = () => {
    const [userId, setUserId] = useState('');

    const { data, isLoading, error } = useAsyncData(
        async (signal) => {
            await delay(800);
            return { id: userId, name: `User ${userId}`, role: 'Researcher' };
        },
        [userId],
        {
            enabled: userId.length > 0,
            initialData: null,
        }
    );

    return (
        <div style={{ padding: 20, fontFamily: 'system-ui' }}>
            <h3>Conditional Fetching Demo</h3>

            <div style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter user ID to fetch..."
                    style={{ padding: '4px 8px', width: 200 }}
                />
            </div>

            <div style={{
                padding: 16,
                background: '#1a1a2e',
                borderRadius: 8,
                color: '#eee',
                minHeight: 80,
            }}>
                {!userId && (
                    <div style={{ color: '#888' }}>
                        Enter a user ID to fetch data
                    </div>
                )}

                {userId && isLoading && (
                    <div style={{ color: '#60a5fa' }}>⏳ Loading user {userId}...</div>
                )}

                {userId && error && (
                    <div style={{ color: '#f87171' }}>❌ {error}</div>
                )}

                {userId && data && !isLoading && (
                    <div>
                        <div><strong>ID:</strong> {data.id}</div>
                        <div><strong>Name:</strong> {data.name}</div>
                        <div><strong>Role:</strong> {data.role}</div>
                    </div>
                )}
            </div>
        </div>
    );
};