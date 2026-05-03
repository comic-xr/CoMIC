/**
 * @file ScopeIndicator.stories.jsx
 * @description Storybook stories for the ScopeIndicator atom
 */

import React from 'react';
import { ScopeIndicator } from './ScopeIndicator';

export default {
    title: 'Atoms/ScopeIndicator',
    component: ScopeIndicator,
    argTypes: {
        scope: {
            control: 'select',
            options: ['ephemeral', 'personal', 'shared', 'workspace', 'project'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        showLabel: {
            control: 'boolean',
        },
        showTooltip: {
            control: 'boolean',
        },
    },
};

const Template = (args) => <ScopeIndicator {...args} />;

export const Default = Template.bind({});
Default.args = {
    scope: 'personal',
    size: 'md',
    showLabel: false,
    showTooltip: true,
};

export const Ephemeral = Template.bind({});
Ephemeral.args = {
    scope: 'ephemeral',
    size: 'md',
};

export const Personal = Template.bind({});
Personal.args = {
    scope: 'personal',
    size: 'md',
};

export const Shared = Template.bind({});
Shared.args = {
    scope: 'shared',
    size: 'md',
};

export const Workspace = Template.bind({});
Workspace.args = {
    scope: 'workspace',
    size: 'md',
};

export const Project = Template.bind({});
Project.args = {
    scope: 'project',
    size: 'md',
};

export const WithLabel = Template.bind({});
WithLabel.args = {
    scope: 'personal',
    size: 'md',
    showLabel: true,
};

export const AllScopes = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {['ephemeral', 'personal', 'shared', 'workspace', 'project'].map(scope => (
            <div key={scope} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <ScopeIndicator scope={scope} size="md" />
                <ScopeIndicator scope={scope} size="md" showLabel />
            </div>
        ))}
    </div>
);

export const Sizes = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <ScopeIndicator scope="personal" size="sm" />
        <ScopeIndicator scope="personal" size="md" />
        <ScopeIndicator scope="personal" size="lg" />
    </div>
);
