// src/ui/react/components/atoms/Text/Text.stories.jsx
import React from 'react';

// Mock Text component for Storybook
const MockText = ({
    children,
    variant = 'body',
    color = 'primary',
    weight = 'normal',
    size,
    uppercase = false,
    truncate = false,
    as: Component = 'span',
    style = {},
}) => {
    const variants = {
        title: { fontSize: '18px', fontWeight: 600 },
        label: { fontSize: '12px', fontWeight: 500 },
        body: { fontSize: '14px', fontWeight: 400 },
        caption: { fontSize: '12px', fontWeight: 400 },
        mono: { fontSize: '13px', fontWeight: 400, fontFamily: 'monospace' },
    };

    const colors = {
        primary: '#e5e7eb',
        secondary: '#9ca3af',
        muted: '#6b7280',
        accent: '#60a5fa',
    };

    const weights = {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    };

    const sizeOverrides = {
        sm: '12px',
        md: '14px',
        lg: '16px',
    };

    const v = variants[variant] || variants.body;
    const c = colors[color] || color;
    const w = weights[weight] || weights.normal;

    return (
        <Component style={{
            ...v,
            color: c,
            fontWeight: w,
            fontSize: size ? sizeOverrides[size] : v.fontSize,
            textTransform: uppercase ? 'uppercase' : 'none',
            overflow: truncate ? 'hidden' : 'visible',
            textOverflow: truncate ? 'ellipsis' : 'clip',
            whiteSpace: truncate ? 'nowrap' : 'normal',
            ...style,
        }}>
            {children}
        </Component>
    );
};

export default {
    title: 'Atoms/Text',
    component: MockText,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['label', 'body', 'caption', 'title', 'mono'],
        },
        color: {
            control: 'select',
            options: ['primary', 'secondary', 'muted', 'accent'],
        },
        weight: {
            control: 'select',
            options: ['normal', 'medium', 'semibold', 'bold'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
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
        children: 'Default text',
    },
};

export const Title = {
    args: {
        children: 'Page Title',
        variant: 'title',
    },
};

export const Label = {
    args: {
        children: 'Form Label',
        variant: 'label',
    },
};

export const Body = {
    args: {
        children: 'This is body text used for paragraphs and main content.',
        variant: 'body',
    },
};

export const Caption = {
    args: {
        children: 'Caption text for supplementary info',
        variant: 'caption',
    },
};

export const Mono = {
    args: {
        children: 'const code = "monospace";',
        variant: 'mono',
    },
};

export const Colors = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MockText color="primary">Primary color</MockText>
            <MockText color="secondary">Secondary color</MockText>
            <MockText color="muted">Muted color</MockText>
            <MockText color="accent">Accent color</MockText>
            <MockText color="#22c55e">Custom green color</MockText>
        </div>
    ),
};

export const Weights = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MockText weight="normal">Normal weight</MockText>
            <MockText weight="medium">Medium weight</MockText>
            <MockText weight="semibold">Semibold weight</MockText>
            <MockText weight="bold">Bold weight</MockText>
        </div>
    ),
};

export const SizeOverrides = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MockText size="sm">Small size</MockText>
            <MockText size="md">Medium size</MockText>
            <MockText size="lg">Large size</MockText>
        </div>
    ),
};

export const Uppercase = {
    args: {
        children: 'uppercase text',
        uppercase: true,
        variant: 'label',
    },
};

export const Truncate = {
    render: () => (
        <div style={{ width: '200px' }}>
            <MockText truncate>
                This is a very long text that should be truncated with an ellipsis when it overflows
            </MockText>
        </div>
    ),
};

export const AsElement = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MockText as="h1" variant="title">Heading 1</MockText>
            <MockText as="h2" variant="title" size="md">Heading 2</MockText>
            <MockText as="p" variant="body">Paragraph element</MockText>
            <MockText as="span" variant="caption">Span element</MockText>
        </div>
    ),
};

export const AllVariants = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <MockText variant="title">Title Variant</MockText>
            <MockText variant="label">Label Variant</MockText>
            <MockText variant="body">Body Variant - used for main content</MockText>
            <MockText variant="caption">Caption Variant - supplementary text</MockText>
            <MockText variant="mono">Mono Variant - code style</MockText>
        </div>
    ),
};
