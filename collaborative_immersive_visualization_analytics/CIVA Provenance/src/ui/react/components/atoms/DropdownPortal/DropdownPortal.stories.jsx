// src/ui/react/components/atoms/DropdownPortal/DropdownPortal.stories.jsx
import React, { useRef, useState } from 'react';
import { DropdownPortal, useDropdown } from './DropdownPortal';

export default {
    title: 'Atoms/DropdownPortal',
    component: DropdownPortal,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        align: {
            control: 'select',
            options: ['start', 'center', 'end'],
        },
        position: {
            control: 'select',
            options: ['top', 'bottom'],
        },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: '100px', background: '#0a0a0f', minHeight: '400px' }}>
                <Story />
            </div>
        ),
    ],
};

// Mock menu content
const MenuContent = ({ onClose }) => (
    <div style={{
        background: '#1a1a2e',
        borderRadius: '8px',
        border: '1px solid #374151',
        padding: '8px 0',
        minWidth: '160px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    }}>
        {['Edit', 'Duplicate', 'Share', 'Delete'].map((item) => (
            <button
                key={item}
                onClick={() => onClose?.()}
                style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    color: item === 'Delete' ? '#ef4444' : '#e5e7eb',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                }}
                onMouseEnter={(e) => e.target.style.background = '#2d2d4a'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
                {item}
            </button>
        ))}
    </div>
);

export const Default = {
    render: function DefaultStory() {
        const [open, setOpen] = useState(false);
        const triggerRef = useRef(null);

        return (
            <>
                <button
                    ref={triggerRef}
                    onClick={() => setOpen(!open)}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                >
                    Open Menu
                </button>
                <DropdownPortal
                    open={open}
                    onClose={() => setOpen(false)}
                    triggerRef={triggerRef}
                >
                    <MenuContent onClose={() => setOpen(false)} />
                </DropdownPortal>
            </>
        );
    },
};

export const AlignCenter = {
    render: function AlignCenterStory() {
        const [open, setOpen] = useState(false);
        const triggerRef = useRef(null);

        return (
            <>
                <button
                    ref={triggerRef}
                    onClick={() => setOpen(!open)}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                >
                    Center Aligned
                </button>
                <DropdownPortal
                    open={open}
                    onClose={() => setOpen(false)}
                    triggerRef={triggerRef}
                    align="center"
                >
                    <MenuContent onClose={() => setOpen(false)} />
                </DropdownPortal>
            </>
        );
    },
};

export const AlignEnd = {
    render: function AlignEndStory() {
        const [open, setOpen] = useState(false);
        const triggerRef = useRef(null);

        return (
            <>
                <button
                    ref={triggerRef}
                    onClick={() => setOpen(!open)}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                >
                    End Aligned
                </button>
                <DropdownPortal
                    open={open}
                    onClose={() => setOpen(false)}
                    triggerRef={triggerRef}
                    align="end"
                >
                    <MenuContent onClose={() => setOpen(false)} />
                </DropdownPortal>
            </>
        );
    },
};

export const PositionTop = {
    render: function PositionTopStory() {
        const [open, setOpen] = useState(false);
        const triggerRef = useRef(null);

        return (
            <div style={{ marginTop: '200px' }}>
                <button
                    ref={triggerRef}
                    onClick={() => setOpen(!open)}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                >
                    Opens Above
                </button>
                <DropdownPortal
                    open={open}
                    onClose={() => setOpen(false)}
                    triggerRef={triggerRef}
                    position="top"
                >
                    <MenuContent onClose={() => setOpen(false)} />
                </DropdownPortal>
            </div>
        );
    },
};

export const WithHook = {
    render: function WithHookStory() {
        const { open, triggerProps, portalProps } = useDropdown();

        return (
            <>
                <button
                    {...triggerProps}
                    style={{
                        padding: '8px 16px',
                        background: open ? '#2563eb' : '#3b82f6',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                >
                    Using Hook {open ? '(Open)' : '(Closed)'}
                </button>
                <DropdownPortal {...portalProps}>
                    <MenuContent onClose={portalProps.onClose} />
                </DropdownPortal>
            </>
        );
    },
};

export const MultipleDropdowns = {
    render: function MultipleDropdownsStory() {
        const dropdown1 = useDropdown();
        const dropdown2 = useDropdown();
        const dropdown3 = useDropdown();

        const buttonStyle = {
            padding: '8px 16px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
        };

        return (
            <div style={{ display: 'flex', gap: '16px' }}>
                <div>
                    <button {...dropdown1.triggerProps} style={buttonStyle}>
                        Menu 1
                    </button>
                    <DropdownPortal {...dropdown1.portalProps}>
                        <MenuContent onClose={dropdown1.close} />
                    </DropdownPortal>
                </div>
                <div>
                    <button {...dropdown2.triggerProps} style={buttonStyle}>
                        Menu 2
                    </button>
                    <DropdownPortal {...dropdown2.portalProps} align="center">
                        <MenuContent onClose={dropdown2.close} />
                    </DropdownPortal>
                </div>
                <div>
                    <button {...dropdown3.triggerProps} style={buttonStyle}>
                        Menu 3
                    </button>
                    <DropdownPortal {...dropdown3.portalProps} align="end">
                        <MenuContent onClose={dropdown3.close} />
                    </DropdownPortal>
                </div>
            </div>
        );
    },
};

export const CustomOffset = {
    render: function CustomOffsetStory() {
        const [open, setOpen] = useState(false);
        const triggerRef = useRef(null);

        return (
            <>
                <button
                    ref={triggerRef}
                    onClick={() => setOpen(!open)}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                >
                    Large Gap (16px)
                </button>
                <DropdownPortal
                    open={open}
                    onClose={() => setOpen(false)}
                    triggerRef={triggerRef}
                    offset={16}
                >
                    <MenuContent onClose={() => setOpen(false)} />
                </DropdownPortal>
            </>
        );
    },
};
