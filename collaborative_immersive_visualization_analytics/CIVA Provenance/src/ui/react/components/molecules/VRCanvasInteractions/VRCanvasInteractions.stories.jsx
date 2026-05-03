/**
 * @file VRCanvasInteractions.stories.jsx
 * @description Stories for VR canvas interaction components.
 */

import React, { useState } from 'react';
import { TransferProvider, useTransfer, DROP_ZONES } from './TransferContext';
import { VRTransferableSource } from './VRTransferableSource';
import { VRCanvasCellTarget } from './VRCanvasCellTarget';
import { VRZonePicker } from './VRZonePicker';
import { VRCanvasEdgeTarget } from './VRCanvasEdgeTarget';
import { VRTransferInstructions } from './VRTransferInstructions';

export default {
    title: 'Molecules/VRCanvasInteractions',
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <TransferProvider
                onTransfer={(data) => console.log('Transfer:', data)}
            >
                <Story />
            </TransferProvider>
        ),
    ],
};

// Sample data
const sampleDatasets = [
    { id: 'd1', name: 'Brain Scan CT', color: '#2dd4bf', type: 'dataset' },
    { id: 'd2', name: 'Heart MRI', color: '#f472b6', type: 'dataset' },
    { id: 'd3', name: 'Lung X-Ray', color: '#a78bfa', type: 'dataset' },
];

const sampleViews = [
    { id: 'v1', name: 'Axial View', color: '#4ade80' },
    { id: 'v2', name: 'Sagittal View', color: '#60a5fa' },
];

// =============================================================================
// TRANSFERABLE SOURCE STORIES
// =============================================================================

export const TransferableSources = () => {
    return (
        <div style={{ padding: 40 }}>
            <h3 style={{ color: '#fff', marginBottom: 20 }}>
                Tap a dataset to start transferring
            </h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {sampleDatasets.map((dataset) => (
                    <VRTransferableSource
                        key={dataset.id}
                        type="dataset"
                        data={dataset}
                    >
                        <DatasetCard {...dataset} />
                    </VRTransferableSource>
                ))}
            </div>

            <VRTransferInstructions />
        </div>
    );
};

// =============================================================================
// CANVAS CELL TARGET STORIES
// =============================================================================

export const CanvasCellTargets = () => {
    const { startTransfer } = useTransfer();

    // Start with a transfer active for demo
    React.useEffect(() => {
        startTransfer('dataset', sampleDatasets[0]);
    }, []);

    return (
        <div style={{ padding: 40 }}>
            <h3 style={{ color: '#fff', marginBottom: 20 }}>
                Canvas cells during transfer mode
            </h3>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 200px)',
                    gap: 16,
                }}
            >
                {/* Empty cells */}
                <VRCanvasCellTarget row={0} col={0} isEmpty={true}>
                    <EmptyCell />
                </VRCanvasCellTarget>
                <VRCanvasCellTarget row={0} col={1} isEmpty={true}>
                    <EmptyCell />
                </VRCanvasCellTarget>

                {/* Occupied cell */}
                <VRCanvasCellTarget
                    row={0}
                    col={2}
                    isEmpty={false}
                    existingPlacement={sampleViews[0]}
                >
                    <OccupiedCell view={sampleViews[0]} />
                </VRCanvasCellTarget>

                {/* More cells */}
                <VRCanvasCellTarget
                    row={1}
                    col={0}
                    isEmpty={false}
                    existingPlacement={sampleViews[1]}
                >
                    <OccupiedCell view={sampleViews[1]} />
                </VRCanvasCellTarget>
                <VRCanvasCellTarget row={1} col={1} isEmpty={true}>
                    <EmptyCell />
                </VRCanvasCellTarget>
                <VRCanvasCellTarget row={1} col={2} isEmpty={true}>
                    <EmptyCell />
                </VRCanvasCellTarget>
            </div>

            <VRTransferInstructions />
        </div>
    );
};

// =============================================================================
// ZONE PICKER STORIES
// =============================================================================

export const ZonePicker = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div style={{ padding: 40 }}>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: '12px 24px',
                    background: '#2dd4bf',
                    border: 'none',
                    borderRadius: 8,
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer',
                }}
            >
                Open Zone Picker
            </button>

            <VRZonePicker
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                existingViewName="Axial View"
                existingViewColor="#4ade80"
            />
        </div>
    );
};

// =============================================================================
// EDGE TARGETS STORIES
// =============================================================================

export const EdgeTargets = () => {
    const { startTransfer } = useTransfer();

    React.useEffect(() => {
        startTransfer('dataset', sampleDatasets[0]);
    }, []);

    return (
        <div style={{ padding: 40 }}>
            <h3 style={{ color: '#fff', marginBottom: 20 }}>
                Canvas edge expansion buttons
            </h3>
            <div
                style={{
                    position: 'relative',
                    width: 500,
                    height: 400,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: 60,
                }}
            >
                <VRCanvasEdgeTarget
                    position="top"
                    canExpand={true}
                    onExpand={(pos, src) => console.log('Expand:', pos, src)}
                />
                <VRCanvasEdgeTarget
                    position="bottom"
                    canExpand={true}
                    onExpand={(pos, src) => console.log('Expand:', pos, src)}
                />
                <VRCanvasEdgeTarget
                    position="left"
                    canExpand={true}
                    onExpand={(pos, src) => console.log('Expand:', pos, src)}
                />
                <VRCanvasEdgeTarget
                    position="right"
                    canExpand={true}
                    onExpand={(pos, src) => console.log('Expand:', pos, src)}
                />

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#666',
                        fontSize: 14,
                    }}
                >
                    Canvas Content Area
                </div>
            </div>

            <VRTransferInstructions />
        </div>
    );
};

// =============================================================================
// COMPLETE TRANSFER FLOW
// =============================================================================

export const CompleteTransferFlow = () => {
    const { showZonePicker, setShowZonePicker, targetCell } = useTransfer();

    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            {/* Sidebar */}
            <div
                style={{
                    width: 280,
                    padding: 20,
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.3)',
                }}
            >
                <h4 style={{ color: '#888', marginBottom: 16, fontSize: 12 }}>
                    DATASETS
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {sampleDatasets.map((dataset) => (
                        <VRTransferableSource
                            key={dataset.id}
                            type="dataset"
                            data={dataset}
                        >
                            <DatasetCard {...dataset} />
                        </VRTransferableSource>
                    ))}
                </div>
            </div>

            {/* Canvas */}
            <div style={{ flex: 1, padding: 40, position: 'relative' }}>
                <h3 style={{ color: '#fff', marginBottom: 20 }}>Canvas</h3>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 20,
                        position: 'relative',
                    }}
                >
                    <VRCanvasCellTarget row={0} col={0} isEmpty={true}>
                        <EmptyCell />
                    </VRCanvasCellTarget>
                    <VRCanvasCellTarget
                        row={0}
                        col={1}
                        isEmpty={false}
                        existingPlacement={sampleViews[0]}
                    >
                        <OccupiedCell view={sampleViews[0]} />
                    </VRCanvasCellTarget>
                    <VRCanvasCellTarget
                        row={1}
                        col={0}
                        isEmpty={false}
                        existingPlacement={sampleViews[1]}
                    >
                        <OccupiedCell view={sampleViews[1]} />
                    </VRCanvasCellTarget>
                    <VRCanvasCellTarget row={1} col={1} isEmpty={true}>
                        <EmptyCell />
                    </VRCanvasCellTarget>
                </div>
            </div>

            {/* Zone picker */}
            <VRZonePicker
                isOpen={showZonePicker}
                onClose={() => setShowZonePicker(false)}
                existingViewName={targetCell?.existingPlacement?.name}
                existingViewColor={targetCell?.existingPlacement?.color}
            />

            {/* Instructions */}
            <VRTransferInstructions />
        </div>
    );
};

CompleteTransferFlow.parameters = {
    docs: {
        description: {
            story:
                'Complete VR transfer flow. Tap a dataset in the sidebar, then tap a canvas cell to place it.',
        },
    },
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function DatasetCard({ name, color }) {
    return (
        <div
            style={{
                padding: 16,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                borderLeft: `3px solid ${color}`,
            }}
        >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                {name}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                Dataset
            </div>
        </div>
    );
}

function EmptyCell() {
    return (
        <div
            style={{
                height: 150,
                background: 'rgba(255,255,255,0.02)',
                border: '2px dashed rgba(255,255,255,0.1)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#444',
                fontSize: 12,
            }}
        >
            Empty
        </div>
    );
}

function OccupiedCell({ view }) {
    return (
        <div
            style={{
                height: 150,
                background: 'rgba(12, 18, 32, 0.8)',
                borderRadius: 8,
                padding: 16,
            }}
        >
            <div
                style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: view.color,
                    marginBottom: 8,
                }}
            >
                {view.name}
            </div>
            <div
                style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 4,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#444',
                    fontSize: 11,
                }}
            >
                3D Viewport
            </div>
        </div>
    );
}
