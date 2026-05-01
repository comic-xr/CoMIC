// src/ui/react/components/molecules/Tabs/Tabs.stories.jsx
import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

// Mock Tabs components
const MockTabs = ({ children, activeTab, onChange }) => (
    <div>{children}</div>
);

const MockTabList = ({ children, activeTab, onChange }) => (
    <div style={{
        display: 'flex',
        borderBottom: '1px solid #374151',
        marginBottom: '16px',
    }}>
        {React.Children.map(children, (child) =>
            React.cloneElement(child, { activeTab, onChange })
        )}
    </div>
);

const MockTab = ({ id, label, activeTab, onChange, icon }) => (
    <button
        onClick={() => onChange(id)}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === id ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === id ? '#e5e7eb' : '#6b7280',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '-1px',
        }}
    >
        {icon && <span>{icon}</span>}
        {label}
    </button>
);

const MockTabPanel = ({ id, activeTab, children }) => (
    activeTab === id ? <div>{children}</div> : null
);

export default {
    title: 'Molecules/Tabs',
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '40px', background: '#0a0a0f', width: '400px' }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    render: function DefaultStory() {
        const [activeTab, setActiveTab] = useState('tab1');
        return (
            <MockTabs activeTab={activeTab} onChange={setActiveTab}>
                <MockTabList activeTab={activeTab} onChange={setActiveTab}>
                    <MockTab id="tab1" label="Tab 1" />
                    <MockTab id="tab2" label="Tab 2" />
                    <MockTab id="tab3" label="Tab 3" />
                </MockTabList>
                <MockTabPanel id="tab1" activeTab={activeTab}>
                    <div style={{ color: '#9ca3af', padding: '16px' }}>Content for Tab 1</div>
                </MockTabPanel>
                <MockTabPanel id="tab2" activeTab={activeTab}>
                    <div style={{ color: '#9ca3af', padding: '16px' }}>Content for Tab 2</div>
                </MockTabPanel>
                <MockTabPanel id="tab3" activeTab={activeTab}>
                    <div style={{ color: '#9ca3af', padding: '16px' }}>Content for Tab 3</div>
                </MockTabPanel>
            </MockTabs>
        );
    },
};

export const WithIcons = {
    render: function IconsStory() {
        const [activeTab, setActiveTab] = useState('files');
        return (
            <MockTabs activeTab={activeTab} onChange={setActiveTab}>
                <MockTabList activeTab={activeTab} onChange={setActiveTab}>
                    <MockTab id="files" label="Files" icon="📁" />
                    <MockTab id="datasets" label="Datasets" icon="📊" />
                    <MockTab id="views" label="Views" icon="👁" />
                </MockTabList>
                <MockTabPanel id="files" activeTab={activeTab}>
                    <div style={{ color: '#9ca3af', padding: '16px' }}>File list...</div>
                </MockTabPanel>
                <MockTabPanel id="datasets" activeTab={activeTab}>
                    <div style={{ color: '#9ca3af', padding: '16px' }}>Dataset list...</div>
                </MockTabPanel>
                <MockTabPanel id="views" activeTab={activeTab}>
                    <div style={{ color: '#9ca3af', padding: '16px' }}>View list...</div>
                </MockTabPanel>
            </MockTabs>
        );
    },
};

export const PanelTabs = {
    render: function PanelTabsStory() {
        const [activeTab, setActiveTab] = useState('properties');
        return (
            <div style={{
                background: '#1a1a2e',
                borderRadius: '8px',
                overflow: 'hidden',
            }}>
                <MockTabs activeTab={activeTab} onChange={setActiveTab}>
                    <MockTabList activeTab={activeTab} onChange={setActiveTab}>
                        <MockTab id="properties" label="Properties" />
                        <MockTab id="styles" label="Styles" />
                        <MockTab id="data" label="Data" />
                    </MockTabList>
                    <MockTabPanel id="properties" activeTab={activeTab}>
                        <div style={{ color: '#9ca3af', padding: '16px' }}>
                            <div style={{ marginBottom: '8px' }}>Width: 100px</div>
                            <div style={{ marginBottom: '8px' }}>Height: 200px</div>
                            <div>Position: Absolute</div>
                        </div>
                    </MockTabPanel>
                    <MockTabPanel id="styles" activeTab={activeTab}>
                        <div style={{ color: '#9ca3af', padding: '16px' }}>
                            <div style={{ marginBottom: '8px' }}>Background: #3b82f6</div>
                            <div>Border: 1px solid</div>
                        </div>
                    </MockTabPanel>
                    <MockTabPanel id="data" activeTab={activeTab}>
                        <div style={{ color: '#9ca3af', padding: '16px' }}>
                            Data bindings...
                        </div>
                    </MockTabPanel>
                </MockTabs>
            </div>
        );
    },
};

export const TwoTabs = {
    render: function TwoTabsStory() {
        const [activeTab, setActiveTab] = useState('code');
        return (
            <MockTabs activeTab={activeTab} onChange={setActiveTab}>
                <MockTabList activeTab={activeTab} onChange={setActiveTab}>
                    <MockTab id="code" label="Code" />
                    <MockTab id="preview" label="Preview" />
                </MockTabList>
                <MockTabPanel id="code" activeTab={activeTab}>
                    <div style={{ color: '#9ca3af', padding: '16px', fontFamily: 'monospace' }}>
                        const x = 1;
                    </div>
                </MockTabPanel>
                <MockTabPanel id="preview" activeTab={activeTab}>
                    <div style={{ color: '#9ca3af', padding: '16px' }}>
                        Preview output here
                    </div>
                </MockTabPanel>
            </MockTabs>
        );
    },
};
