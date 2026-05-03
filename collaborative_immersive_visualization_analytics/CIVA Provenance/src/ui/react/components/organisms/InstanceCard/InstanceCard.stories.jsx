import { useState } from 'react';
import {
    InstanceCard,
    INSTANCE_CARD_VARIANTS,
    INSTANCE_CARD_COLOR_POSITIONS,
} from './InstanceCard';

export default {
    title: 'Organisms/InstanceCard',
    component: InstanceCard,
    parameters: {
        layout: 'padded',
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div style={{
                width: '280px',
                background: '#1a1a1a',
                borderRadius: '8px',
                padding: '8px'
            }}>
                <Story />
            </div>
        ),
    ],
    argTypes: {
        variant: {
            control: 'select',
            options: Object.values(INSTANCE_CARD_VARIANTS),
        },
        colorPosition: {
            control: 'select',
            options: Object.values(INSTANCE_CARD_COLOR_POSITIONS),
        },
        showGradient: { control: 'boolean' },
        showIcon: { control: 'boolean' },
        showDataset: { control: 'boolean' },
        showType: { control: 'boolean' },
        showSettings: { control: 'boolean' },
    },
};

// Sample view data
const sampleView = {
    id: 'view-123',
    name: 'Sales Analysis 2024',
    datasetId: 'dataset-456',
    datasetName: 'quarterly_sales.csv',
    handlerType: 'vtk',
    color: '#60a5fa',
};

const sampleDataset = {
    id: 'dataset-456',
    name: 'quarterly_sales.csv',
    filename: 'quarterly_sales.csv',
};

// =============================================================================
// VARIANT STORIES
// =============================================================================

export const Header = {
    args: {
        view: sampleView,
        dataset: sampleDataset,
        variant: 'header',
        showGradient: true,
    },
};

export const Compact = {
    args: {
        view: sampleView,
        dataset: sampleDataset,
        variant: 'compact',
        showGradient: true,
    },
};

export const Inline = {
    args: {
        view: sampleView,
        dataset: sampleDataset,
        variant: 'inline',
    },
};

export const Minimal = {
    args: {
        view: sampleView,
        dataset: sampleDataset,
        variant: 'minimal',
        showGradient: true,
    },
};

// =============================================================================
// COLOR POSITION STORIES
// =============================================================================

export const ColorBarLeft = {
    args: {
        view: { ...sampleView, color: '#34d399' },
        dataset: sampleDataset,
        variant: 'header',
        colorPosition: 'left',
        showGradient: true,
    },
};

export const ColorBarRight = {
    args: {
        view: { ...sampleView, color: '#fb7185' },
        dataset: sampleDataset,
        variant: 'header',
        colorPosition: 'right',
        showGradient: true,
    },
};

export const NoGradient = {
    args: {
        view: { ...sampleView, color: '#c084fc' },
        dataset: sampleDataset,
        variant: 'header',
        showGradient: false,
    },
};

// =============================================================================
// INTERACTIVE STORIES
// =============================================================================

export const WithRename = () => {
    const [viewName, setViewName] = useState('Editable View Name');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                Double-click the name to rename
            </p>
            <InstanceCard
                view={{ ...sampleView, name: viewName }}
                dataset={sampleDataset}
                variant="header"
                showGradient={true}
                onRename={(id, newName) => {
                    console.log('Rename:', id, newName);
                    setViewName(newName);
                }}
            />
            <div style={{
                padding: '8px',
                background: '#0f0f0f',
                borderRadius: '4px',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
            }}>
                Current name: {viewName}
            </div>
        </div>
    );
};

export const WithSettings = () => {
    const [settingsOpened, setSettingsOpened] = useState(0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                Hover to see settings button, click to open modal
            </p>
            <InstanceCard
                view={sampleView}
                dataset={sampleDataset}
                variant="header"
                showGradient={true}
                onSettings={(id) => {
                    console.log('Settings clicked:', id);
                    setSettingsOpened(s => s + 1);
                }}
            />
            <div style={{
                padding: '8px',
                background: '#0f0f0f',
                borderRadius: '4px',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
            }}>
                Settings opened: {settingsOpened} times
            </div>
        </div>
    );
};

export const Clickable = () => {
    const [clicks, setClicks] = useState(0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                Click the card to trigger onClick
            </p>
            <InstanceCard
                view={sampleView}
                dataset={sampleDataset}
                variant="header"
                showGradient={true}
                onClick={(id) => {
                    console.log('Clicked:', id);
                    setClicks(c => c + 1);
                }}
            />
            <div style={{
                padding: '8px',
                background: '#0f0f0f',
                borderRadius: '4px',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
            }}>
                Clicks: {clicks}
            </div>
        </div>
    );
};

// =============================================================================
// ALL VARIANTS SHOWCASE
// =============================================================================

export const AllVariants = () => {
    const colors = ['#60a5fa', '#34d399', '#fb7185', '#c084fc', '#fbbf24', '#2dd4bf'];

    const variants = [
        { name: 'Header', variant: 'header' },
        { name: 'Compact', variant: 'compact' },
        { name: 'Inline', variant: 'inline' },
        { name: 'Minimal', variant: 'minimal' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {variants.map((v, i) => (
                <div key={v.variant}>
                    <p style={{
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.4)',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        {v.name} Variant
                    </p>
                    <InstanceCard
                        view={{ ...sampleView, color: colors[i] }}
                        dataset={sampleDataset}
                        variant={v.variant}
                        showGradient={true}
                        onRename={(id, name) => console.log('Rename:', name)}
                    />
                </div>
            ))}
        </div>
    );
};

AllVariants.decorators = [
    (Story) => (
        <div style={{
            width: '300px',
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '16px'
        }}>
            <Story />
        </div>
    ),
];

// =============================================================================
// COLOR SHOWCASE
// =============================================================================

export const ColorShowcase = () => {
    const colors = [
        { name: 'Blue', hex: '#60a5fa' },
        { name: 'Green', hex: '#34d399' },
        { name: 'Teal', hex: '#2dd4bf' },
        { name: 'Pink', hex: '#fb7185' },
        { name: 'Purple', hex: '#c084fc' },
        { name: 'Amber', hex: '#fbbf24' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                Instance colors with gradient effect
            </p>
            {colors.map((color) => (
                <InstanceCard
                    key={color.name}
                    view={{
                        ...sampleView,
                        name: `${color.name} Instance`,
                        color: color.hex,
                    }}
                    dataset={sampleDataset}
                    variant="compact"
                    showGradient={true}
                />
            ))}
        </div>
    );
};

ColorShowcase.decorators = [
    (Story) => (
        <div style={{
            width: '280px',
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '12px'
        }}>
            <Story />
        </div>
    ),
];

// =============================================================================
// POSITION COMPARISON
// =============================================================================

export const PositionComparison = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <p style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.4)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                }}>
                    Left Color Bar
                </p>
                <InstanceCard
                    view={{ ...sampleView, color: '#34d399' }}
                    dataset={sampleDataset}
                    variant="header"
                    colorPosition="left"
                    showGradient={true}
                />
            </div>
            <div>
                <p style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.4)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                }}>
                    Right Color Bar
                </p>
                <InstanceCard
                    view={{ ...sampleView, color: '#fb7185' }}
                    dataset={sampleDataset}
                    variant="header"
                    colorPosition="right"
                    showGradient={true}
                />
            </div>
            <div>
                <p style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.4)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                }}>
                    Left Without Gradient
                </p>
                <InstanceCard
                    view={{ ...sampleView, color: '#c084fc' }}
                    dataset={sampleDataset}
                    variant="header"
                    colorPosition="left"
                    showGradient={false}
                />
            </div>
        </div>
    );
};

PositionComparison.decorators = [
    (Story) => (
        <div style={{
            width: '300px',
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '16px'
        }}>
            <Story />
        </div>
    ),
];

// =============================================================================
// USE CASE: INSTANCE TOOLS HEADER
// =============================================================================

export const InstanceToolsHeader = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                As it would appear in the Instance Tools tab header
            </p>
            <div style={{
                background: '#0f0f0f',
                borderRadius: '8px',
                overflow: 'hidden',
            }}>
                <InstanceCard
                    view={sampleView}
                    dataset={sampleDataset}
                    variant="header"
                    colorPosition="left"
                    showGradient={true}
                    onRename={(id, name) => console.log('Rename:', name)}
                    onSettings={(id) => console.log('Settings:', id)}
                />
                <div style={{
                    padding: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                }}>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                        Tool content would go here...
                    </p>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// USE CASE: FLOATING PANEL
// =============================================================================

export const FloatingPanel = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                Compact variant for floating panels
            </p>
            <div style={{
                background: 'rgba(15, 15, 15, 0.95)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
                <InstanceCard
                    view={{ ...sampleView, name: 'Active Instance' }}
                    dataset={sampleDataset}
                    variant="compact"
                    colorPosition="left"
                    showGradient={true}
                    showSettings={true}
                />
                <div style={{
                    padding: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
                        Tools: Clip, Measure, Annotate...
                    </p>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// USE CASE: CANVAS CELL HEADER
// =============================================================================

export const CanvasCellHeader = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                Minimal/inline variant for canvas cell headers
            </p>
            <div style={{
                background: '#0a0a0a',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                overflow: 'hidden',
            }}>
                <InstanceCard
                    view={{ ...sampleView, name: 'Cell View' }}
                    dataset={sampleDataset}
                    variant="inline"
                    showSettings={true}
                />
                <div style={{
                    height: '150px',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
                        [View Content]
                    </p>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// NO VIEW SELECTED
// =============================================================================

export const NoViewSelected = {
    args: {
        viewId: null,
        view: null,
        variant: 'header',
        showGradient: true,
    },
};

// =============================================================================
// LONG NAME TRUNCATION
// =============================================================================

export const LongName = {
    args: {
        view: {
            ...sampleView,
            name: 'This is a very long view name that should be truncated with ellipsis',
        },
        dataset: {
            ...sampleDataset,
            filename: 'very_long_dataset_filename_that_should_also_truncate.csv',
        },
        variant: 'header',
        showGradient: true,
    },
};

// =============================================================================
// DIFFERENT HANDLER TYPES
// =============================================================================

export const HandlerTypes = () => {
    const types = [
        { type: 'vtk', name: 'VTK Volume Render' },
        { type: 'image', name: 'Image View' },
        { type: 'chart', name: 'Chart View' },
        { type: 'table', name: 'Table View' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {types.map((t) => (
                <InstanceCard
                    key={t.type}
                    view={{
                        ...sampleView,
                        name: t.name,
                        handlerType: t.type,
                    }}
                    dataset={sampleDataset}
                    variant="header"
                    showGradient={true}
                />
            ))}
        </div>
    );
};

// =============================================================================
// LINK SYSTEM STORIES
// =============================================================================

export const WithLinkBadges = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                InstanceCard with link system badges enabled
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <InstanceCard
                    view={{ ...sampleView, name: 'Hub View (Synced)' }}
                    dataset={sampleDataset}
                    variant="header"
                    showGradient={true}
                    showBadges={true}
                    isHub={true}
                    linkCount={4}
                    viewerCount={2}
                    syncStatus="synced"
                    onLinkClick={() => console.log('Link clicked')}
                />
                <InstanceCard
                    view={{ ...sampleView, name: 'Following View', color: '#34d399' }}
                    dataset={sampleDataset}
                    variant="header"
                    showGradient={true}
                    showBadges={true}
                    linkMode="follow"
                    linkCount={2}
                    syncStatus="syncing"
                    onLinkClick={() => console.log('Link clicked')}
                />
                <InstanceCard
                    view={{ ...sampleView, name: 'Broadcasting View', color: '#c084fc' }}
                    dataset={sampleDataset}
                    variant="header"
                    showGradient={true}
                    showBadges={true}
                    linkMode="broadcast"
                    linkCount={6}
                    viewerCount={5}
                    onLinkClick={() => console.log('Link clicked')}
                />
            </div>
        </div>
    );
};

export const HubIndicator = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                Hub views have an amber color bar indicator
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <InstanceCard
                    view={{ ...sampleView, name: 'Normal View' }}
                    dataset={sampleDataset}
                    variant="header"
                    showGradient={true}
                />
                <InstanceCard
                    view={{ ...sampleView, name: 'Hub View (Source of Truth)' }}
                    dataset={sampleDataset}
                    variant="header"
                    showGradient={true}
                    isHub={true}
                    showBadges={true}
                />
            </div>
        </div>
    );
};

export const LinkModes = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                Different link modes: Follow, Sync, Broadcast
            </p>
            <InstanceCard
                view={{ ...sampleView, name: 'Following Camera & Filters', color: '#2dd4bf' }}
                dataset={sampleDataset}
                variant="compact"
                showGradient={true}
                showBadges={true}
                linkMode="follow"
                linkCount={2}
            />
            <InstanceCard
                view={{ ...sampleView, name: 'Synced Bi-directionally', color: '#34d399' }}
                dataset={sampleDataset}
                variant="compact"
                showGradient={true}
                showBadges={true}
                linkMode="sync"
                linkCount={3}
            />
            <InstanceCard
                view={{ ...sampleView, name: 'Broadcasting to Others', color: '#a78bfa' }}
                dataset={sampleDataset}
                variant="compact"
                showGradient={true}
                showBadges={true}
                linkMode="broadcast"
                linkCount={4}
                viewerCount={3}
            />
        </div>
    );
};

export const SyncStatuses = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                Sync status indicators: synced, syncing, error, paused
            </p>
            <InstanceCard
                view={{ ...sampleView, name: 'Synced' }}
                dataset={sampleDataset}
                variant="compact"
                showGradient={true}
                showBadges={true}
                syncStatus="synced"
                linkCount={2}
            />
            <InstanceCard
                view={{ ...sampleView, name: 'Syncing...', color: '#2dd4bf' }}
                dataset={sampleDataset}
                variant="compact"
                showGradient={true}
                showBadges={true}
                syncStatus="syncing"
                linkCount={2}
            />
            <InstanceCard
                view={{ ...sampleView, name: 'Sync Error', color: '#fb7185' }}
                dataset={sampleDataset}
                variant="compact"
                showGradient={true}
                showBadges={true}
                syncStatus="error"
                linkCount={2}
            />
            <InstanceCard
                view={{ ...sampleView, name: 'Paused', color: '#fbbf24' }}
                dataset={sampleDataset}
                variant="compact"
                showGradient={true}
                showBadges={true}
                syncStatus="paused"
                linkCount={2}
            />
        </div>
    );
};

export const CompactWithBadges = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                Compact variant works well with badges for dense lists
            </p>
            <InstanceCard
                view={{ ...sampleView, name: 'Hub: Main Analysis', color: '#fbbf24' }}
                dataset={sampleDataset}
                variant="compact"
                showGradient={true}
                showBadges={true}
                isHub={true}
                linkCount={5}
                viewerCount={3}
                syncStatus="synced"
            />
            <InstanceCard
                view={{ ...sampleView, name: 'Following: Dr. Smith View', color: '#34d399' }}
                dataset={sampleDataset}
                variant="compact"
                showGradient={true}
                showBadges={true}
                linkMode="follow"
                linkCount={2}
                syncStatus="syncing"
            />
            <InstanceCard
                view={{ ...sampleView, name: 'Unlinked View', color: '#60a5fa' }}
                dataset={sampleDataset}
                variant="compact"
                showGradient={true}
                showBadges={true}
            />
        </div>
    );
};
