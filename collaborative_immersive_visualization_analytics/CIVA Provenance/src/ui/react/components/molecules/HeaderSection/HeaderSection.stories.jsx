// src/ui/react/components/molecules/HeaderSection/HeaderSection.stories.jsx
import React, { useState } from 'react';
import { CollapsibleHeaderSection, DismissibleCard, SectionHeader } from './index';

export default {
    title: 'Molecules/HeaderSection',
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '300px' }}>
                <Story />
            </div>
        ),
    ],
};

export const SectionHeaderBasic = {
    render: () => (
        <SectionHeader title="Section Title" />
    ),
};

export const SectionHeaderWithIcon = {
    render: () => (
        <SectionHeader title="Settings" icon="settings" />
    ),
};

export const SectionHeaderWithAction = {
    render: () => (
        <SectionHeader
            title="Files"
            icon="folder"
            action={{ label: 'Add', onClick: () => {} }}
        />
    ),
};

export const CollapsibleSection = {
    render: function CollapsibleStory() {
        return (
            <CollapsibleHeaderSection title="Collapsible" icon="layers" defaultExpanded>
                <div style={{ color: '#9ca3af', padding: '12px' }}>
                    This content can be collapsed
                </div>
            </CollapsibleHeaderSection>
        );
    },
};

export const CollapsibleClosed = {
    render: () => (
        <CollapsibleHeaderSection title="Collapsed" icon="archive" defaultExpanded={false}>
            <div style={{ color: '#9ca3af', padding: '12px' }}>
                Hidden content
            </div>
        </CollapsibleHeaderSection>
    ),
};

export const DismissibleCardDefault = {
    render: function DismissibleStory() {
        const [dismissed, setDismissed] = useState(false);

        if (dismissed) {
            return (
                <button
                    onClick={() => setDismissed(false)}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                >
                    Show Card Again
                </button>
            );
        }

        return (
            <DismissibleCard
                title="Welcome!"
                onDismiss={() => setDismissed(true)}
            >
                <p style={{ color: '#9ca3af', margin: 0 }}>
                    This is a dismissible card that can be closed.
                </p>
            </DismissibleCard>
        );
    },
};

export const MultipleSections = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <CollapsibleHeaderSection title="General" icon="settings" defaultExpanded>
                <div style={{ color: '#9ca3af', padding: '12px' }}>General settings</div>
            </CollapsibleHeaderSection>
            <CollapsibleHeaderSection title="Appearance" icon="palette" defaultExpanded={false}>
                <div style={{ color: '#9ca3af', padding: '12px' }}>Theme options</div>
            </CollapsibleHeaderSection>
            <CollapsibleHeaderSection title="Advanced" icon="sliders" defaultExpanded={false}>
                <div style={{ color: '#9ca3af', padding: '12px' }}>Advanced options</div>
            </CollapsibleHeaderSection>
        </div>
    ),
};

export const AllComponents = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <h4 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '12px' }}>SectionHeader</h4>
                <SectionHeader title="Simple Header" icon="file" />
            </div>
            <div>
                <h4 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '12px' }}>CollapsibleHeaderSection</h4>
                <CollapsibleHeaderSection title="Expandable" icon="layers">
                    <div style={{ color: '#9ca3af', padding: '12px' }}>Content</div>
                </CollapsibleHeaderSection>
            </div>
            <div>
                <h4 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '12px' }}>DismissibleCard</h4>
                <DismissibleCard title="Notice" onDismiss={() => {}}>
                    <p style={{ color: '#9ca3af', margin: 0, fontSize: '13px' }}>Dismissible content</p>
                </DismissibleCard>
            </div>
        </div>
    ),
};
