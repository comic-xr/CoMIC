// src/ui/react/components/organisms/PropertyPanel/PropertyPanel.stories.jsx
import React, { useState } from 'react';
import { PropertyPanel } from './PropertyPanel';

export default {
    title: 'Organisms/PropertyPanel',
    component: PropertyPanel,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        onClose: { action: 'close' },
        onChange: { action: 'change' },
    },
    decorators: [
        (Story) => (
            <div style={{
                padding: '20px',
                background: '#0a0a0f',
                width: '320px',
                height: '500px',
            }}>
                <Story />
            </div>
        ),
    ],
};

const sampleSections = [
    {
        id: 'appearance',
        title: 'Appearance',
        icon: 'palette',
        properties: [
            { id: 'visible', type: 'toggle', label: 'Visible', value: true },
            { id: 'opacity', type: 'slider', label: 'Opacity', value: 0.8, min: 0, max: 1, step: 0.1 },
            { id: 'color', type: 'color', label: 'Color', value: '#3b82f6' },
        ],
    },
    {
        id: 'transform',
        title: 'Transform',
        icon: 'move',
        properties: [
            { id: 'position.x', type: 'info', label: 'Position X', value: '0.00' },
            { id: 'position.y', type: 'info', label: 'Position Y', value: '0.00' },
            { id: 'position.z', type: 'info', label: 'Position Z', value: '0.00' },
            { id: 'scale', type: 'slider', label: 'Scale', value: 1, min: 0.1, max: 3, step: 0.1 },
        ],
    },
    {
        id: 'rendering',
        title: 'Rendering',
        icon: 'eye',
        defaultExpanded: false,
        properties: [
            {
                id: 'renderMode',
                type: 'chips',
                label: 'Render Mode',
                value: 'solid',
                options: [
                    { value: 'solid', label: 'Solid' },
                    { value: 'wireframe', label: 'Wire' },
                    { value: 'points', label: 'Points' },
                ],
            },
            { id: 'shadows', type: 'toggle', label: 'Cast Shadows', value: true },
            { id: 'receiveShadows', type: 'toggle', label: 'Receive Shadows', value: true },
        ],
    },
];

export const Default = {
    args: {
        title: 'Object Properties',
        icon: 'box',
        sections: sampleSections,
    },
};

export const Interactive = {
    render: function InteractiveStory() {
        const [state, setState] = useState({
            visible: true,
            opacity: 0.8,
            color: '#3b82f6',
            scale: 1,
            renderMode: 'solid',
            shadows: true,
            receiveShadows: true,
        });

        const handleChange = (propertyPath, value) => {
            const key = propertyPath.split('.').pop();
            setState(prev => ({ ...prev, [key]: value }));
        };

        const sections = [
            {
                id: 'appearance',
                title: 'Appearance',
                icon: 'palette',
                properties: [
                    { id: 'visible', type: 'toggle', label: 'Visible', value: state.visible },
                    { id: 'opacity', type: 'slider', label: 'Opacity', value: state.opacity, min: 0, max: 1, step: 0.1 },
                    { id: 'color', type: 'color', label: 'Color', value: state.color },
                ],
            },
            {
                id: 'transform',
                title: 'Transform',
                icon: 'move',
                properties: [
                    { id: 'scale', type: 'slider', label: 'Scale', value: state.scale, min: 0.1, max: 3, step: 0.1 },
                ],
            },
            {
                id: 'rendering',
                title: 'Rendering',
                icon: 'eye',
                properties: [
                    {
                        id: 'renderMode',
                        type: 'chips',
                        label: 'Render Mode',
                        value: state.renderMode,
                        options: [
                            { value: 'solid', label: 'Solid' },
                            { value: 'wireframe', label: 'Wire' },
                            { value: 'points', label: 'Points' },
                        ],
                    },
                    { id: 'shadows', type: 'toggle', label: 'Cast Shadows', value: state.shadows },
                    { id: 'receiveShadows', type: 'toggle', label: 'Receive Shadows', value: state.receiveShadows },
                ],
            },
        ];

        return (
            <PropertyPanel
                title="Interactive Demo"
                icon="sliders"
                sections={sections}
                onChange={handleChange}
                onClose={() => {}}
            />
        );
    },
};

export const ViewSettings = {
    args: {
        title: 'View Settings',
        icon: 'monitor',
        sections: [
            {
                id: 'display',
                title: 'Display',
                icon: 'eye',
                properties: [
                    { id: 'showGrid', type: 'toggle', label: 'Show Grid', value: true },
                    { id: 'showAxes', type: 'toggle', label: 'Show Axes', value: true },
                    { id: 'showLabels', type: 'toggle', label: 'Show Labels', value: false },
                    { id: 'backgroundColor', type: 'color', label: 'Background', value: '#1a1a2e' },
                ],
            },
            {
                id: 'camera',
                title: 'Camera',
                icon: 'video',
                properties: [
                    {
                        id: 'projection',
                        type: 'chips',
                        label: 'Projection',
                        value: 'perspective',
                        options: [
                            { value: 'perspective', label: 'Perspective' },
                            { value: 'orthographic', label: 'Ortho' },
                        ],
                    },
                    { id: 'fov', type: 'slider', label: 'Field of View', value: 60, min: 30, max: 120, step: 5 },
                ],
            },
        ],
    },
};

export const DatasetProperties = {
    args: {
        title: 'Dataset Info',
        icon: 'database',
        collapsible: false,
        sections: [
            {
                id: 'info',
                title: 'Information',
                icon: 'info',
                properties: [
                    { id: 'name', type: 'info', label: 'Name', value: 'brain_scan.vtp' },
                    { id: 'type', type: 'info', label: 'Type', value: 'VTK PolyData' },
                    { id: 'size', type: 'info', label: 'Size', value: '2.4 MB' },
                    { id: 'points', type: 'info', label: 'Points', value: '145,230' },
                    { id: 'cells', type: 'info', label: 'Cells', value: '290,412' },
                ],
            },
            {
                id: 'arrays',
                title: 'Data Arrays',
                icon: 'layers',
                properties: [
                    { id: 'normals', type: 'info', label: 'Normals', value: 'Float32 [3]' },
                    { id: 'scalars', type: 'info', label: 'Scalars', value: 'Float64 [1]' },
                    { id: 'colors', type: 'info', label: 'Colors', value: 'UInt8 [4]' },
                ],
            },
        ],
    },
};

export const Empty = {
    args: {
        title: 'Properties',
        icon: 'sliders',
        sections: [],
    },
};

export const AnnotationEditor = {
    args: {
        title: 'Edit Annotation',
        icon: 'messageSquare',
        sections: [
            {
                id: 'content',
                title: 'Content',
                icon: 'edit',
                properties: [
                    { id: 'title', type: 'info', label: 'Title', value: 'Important Finding' },
                    { id: 'author', type: 'info', label: 'Author', value: 'Dr. Smith' },
                ],
            },
            {
                id: 'appearance',
                title: 'Appearance',
                icon: 'palette',
                properties: [
                    { id: 'color', type: 'color', label: 'Marker Color', value: '#ef4444' },
                    { id: 'markerSize', type: 'slider', label: 'Marker Size', value: 12, min: 6, max: 24, step: 2 },
                    { id: 'showLine', type: 'toggle', label: 'Show Leader Line', value: true },
                ],
            },
            {
                id: 'visibility',
                title: 'Visibility',
                icon: 'eye',
                properties: [
                    { id: 'visible', type: 'toggle', label: 'Visible', value: true },
                    { id: 'pinned', type: 'toggle', label: 'Pin to View', value: false },
                ],
            },
        ],
    },
};
