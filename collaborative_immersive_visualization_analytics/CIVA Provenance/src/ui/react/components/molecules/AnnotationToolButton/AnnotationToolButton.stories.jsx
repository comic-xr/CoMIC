// src/ui/react/components/molecules/AnnotationToolButton/AnnotationToolButton.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

const TOOL_CONFIG = {
    select: { icon: 'mousePointer', label: 'Select' },
    point: { icon: 'mapPin', label: 'Point' },
    region: { icon: 'square', label: 'Region' },
    measure: { icon: 'ruler', label: 'Measure' },
    ruler: { icon: 'ruler', label: 'Ruler' },
    angle: { icon: 'arrowUpRight', label: 'Angle' },
    text: { icon: 'type', label: 'Text' },
    eraser: { icon: 'eraser', label: 'Eraser' },
    arrow: { icon: 'arrowRight', label: 'Arrow' },
    line: { icon: 'minus', label: 'Line' },
    freehand: { icon: 'edit3', label: 'Freehand' },
};

const mockGetToolTypes = () => Object.keys(TOOL_CONFIG);

// Mock component for Storybook
const MockAnnotationToolButton = ({
    tool = 'select',
    active = false,
    disabled = false,
    showLabel = true,
    size = 'md',
    onClick,
}) => {
    const config = TOOL_CONFIG[tool] || TOOL_CONFIG.select;
    const sizes = {
        sm: { padding: '4px 8px', iconSize: 12, fontSize: '9px' },
        md: { padding: '6px 10px', iconSize: 14, fontSize: '10px' },
        lg: { padding: '8px 12px', iconSize: 16, fontSize: '11px' },
    };
    const s = sizes[size] || sizes.md;

    return (
        <button
            onClick={() => !disabled && onClick?.(tool)}
            disabled={disabled}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: s.padding,
                background: active
                    ? 'rgba(96, 165, 250, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                border: active
                    ? '1px solid rgba(96, 165, 250, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: active ? '#60a5fa' : disabled ? '#4b5563' : '#e5e7eb',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.15s',
            }}
        >
            <Icon name={config.icon} size={s.iconSize} />
            {showLabel && (
                <span style={{ fontSize: s.fontSize }}>{config.label}</span>
            )}
        </button>
    );
};

export default {
    title: 'Molecules/AnnotationToolButton',
    component: MockAnnotationToolButton,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        tool: {
            control: 'select',
            options: ['select', 'point', 'region', 'measure', 'angle', 'text', 'eraser', 'arrow', 'line'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        onClick: { action: 'clicked' },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        tool: 'select',
    },
};

export const Active = {
    args: {
        tool: 'point',
        active: true,
    },
};

export const Disabled = {
    args: {
        tool: 'measure',
        disabled: true,
    },
};

export const IconOnly = {
    args: {
        tool: 'eraser',
        showLabel: false,
    },
};

export const Sizes = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <MockAnnotationToolButton tool="point" size="sm" />
            <MockAnnotationToolButton tool="point" size="md" />
            <MockAnnotationToolButton tool="point" size="lg" />
        </div>
    ),
};

export const AllTools = {
    render: () => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {mockGetToolTypes().map(tool => (
                <MockAnnotationToolButton key={tool} tool={tool} />
            ))}
        </div>
    ),
};

export const AllToolsActive = {
    render: () => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {mockGetToolTypes().map(tool => (
                <MockAnnotationToolButton key={tool} tool={tool} active />
            ))}
        </div>
    ),
};

export const ToolPalette = {
    render: () => {
        const [activeTool, setActiveTool] = useState('select');

        const toolGroups = [
            { name: 'Selection', tools: ['select'] },
            { name: 'Markers', tools: ['point', 'text'] },
            { name: 'Regions', tools: ['region', 'freehand'] },
            { name: 'Measurement', tools: ['ruler', 'angle'] },
            { name: 'Utility', tools: ['eraser'] },
        ];

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                <div style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    Annotation Tools
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {toolGroups.map(group => (
                        <div key={group.name} style={{
                            display: 'flex',
                            gap: '4px',
                            paddingRight: '12px',
                            marginRight: '4px',
                            borderRight: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {group.tools.map(tool => (
                                <MockAnnotationToolButton
                                    key={tool}
                                    tool={tool}
                                    active={activeTool === tool}
                                    onClick={setActiveTool}
                                    showLabel={false}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                <div style={{ fontSize: '11px', color: '#666' }}>
                    Active: <span style={{ color: '#60a5fa' }}>{activeTool}</span>
                </div>
            </div>
        );
    },
};

export const ContextualTools = {
    render: () => {
        const [context, setContext] = useState('instance');
        const [activeTool, setActiveTool] = useState('select');

        const instanceTools = ['select', 'point', 'ruler', 'angle', 'region'];
        const workspaceTools = ['select', 'text', 'arrow', 'line'];

        const tools = context === 'instance' ? instanceTools : workspaceTools;

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => { setContext('instance'); setActiveTool('select'); }}
                        style={{
                            padding: '8px 16px',
                            background: context === 'instance' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${context === 'instance' ? 'rgba(96, 165, 250, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '4px',
                            color: context === 'instance' ? '#60a5fa' : '#888',
                            cursor: 'pointer',
                            fontSize: '11px'
                        }}
                    >
                        Instance Tools
                    </button>
                    <button
                        onClick={() => { setContext('workspace'); setActiveTool('select'); }}
                        style={{
                            padding: '8px 16px',
                            background: context === 'workspace' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${context === 'workspace' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '4px',
                            color: context === 'workspace' ? '#4ade80' : '#888',
                            cursor: 'pointer',
                            fontSize: '11px'
                        }}
                    >
                        Workspace Tools
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {tools.map(tool => (
                        <MockAnnotationToolButton
                            key={tool}
                            tool={tool}
                            active={activeTool === tool}
                            onClick={setActiveTool}
                        />
                    ))}
                </div>
            </div>
        );
    },
};

export const IconOnlyGrid = {
    render: () => {
        const [activeTool, setActiveTool] = useState('select');
        const tools = ['select', 'point', 'region', 'ruler', 'angle', 'text', 'arrow', 'eraser'];

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, auto)',
                gap: '4px',
                padding: '8px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
            }}>
                {tools.map(tool => (
                    <MockAnnotationToolButton
                        key={tool}
                        tool={tool}
                        active={activeTool === tool}
                        onClick={setActiveTool}
                        showLabel={false}
                        size="sm"
                    />
                ))}
            </div>
        );
    },
};
