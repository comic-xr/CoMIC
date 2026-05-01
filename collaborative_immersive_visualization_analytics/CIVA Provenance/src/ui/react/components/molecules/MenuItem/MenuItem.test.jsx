import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MenuItem } from './MenuItem';

// Mock the useAdaptive hook
vi.mock('@UI/react/context', () => ({
    useAdaptive: () => ({ isVR: false, mode: 'desktop' }),
}));

// Mock Icon component
vi.mock('@UI/react/components/atoms', () => ({
    Icon: ({ name, className }) => <span data-testid={`icon-${name}`} className={className} />,
}));

describe('MenuItem', () => {
    it('renders as a menuitem button', () => {
        render(<MenuItem label="Action" />);
        expect(screen.getByRole('menuitem')).toBeInTheDocument();
    });

    it('renders label text', () => {
        render(<MenuItem label="Edit" />);
        expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('renders icon when provided', () => {
        render(<MenuItem label="Settings" icon="settings" />);
        expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
    });

    it('renders shortcut when provided', () => {
        render(<MenuItem label="Save" shortcut="⌘S" />);
        expect(screen.getByText('⌘S')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
        render(<MenuItem label="Export" description="Save to file" />);
        expect(screen.getByText('Save to file')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
        const handleClick = vi.fn();
        render(<MenuItem label="Click me" onClick={handleClick} />);

        fireEvent.click(screen.getByRole('menuitem'));
        expect(handleClick).toHaveBeenCalled();
    });

    it('does not call onClick when disabled', () => {
        const handleClick = vi.fn();
        render(<MenuItem label="Disabled" onClick={handleClick} disabled />);

        fireEvent.click(screen.getByRole('menuitem'));
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies disabled class and attribute when disabled', () => {
        render(<MenuItem label="Disabled" disabled />);
        const item = screen.getByRole('menuitem');
        expect(item).toBeDisabled();
        expect(item).toHaveClass('menu-item--disabled');
    });

    it('applies danger class when danger prop is true', () => {
        render(<MenuItem label="Delete" danger />);
        expect(screen.getByRole('menuitem')).toHaveClass('menu-item--danger');
    });

    it('applies selected class and shows check icon when selected', () => {
        render(<MenuItem label="Option" selected />);
        expect(screen.getByRole('menuitem')).toHaveClass('menu-item--selected');
        expect(screen.getByTestId('icon-check')).toBeInTheDocument();
    });

    it('responds to keyboard Enter key', () => {
        const handleClick = vi.fn();
        render(<MenuItem label="Action" onClick={handleClick} />);

        fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Enter' });
        expect(handleClick).toHaveBeenCalled();
    });

    it('responds to keyboard Space key', () => {
        const handleClick = vi.fn();
        render(<MenuItem label="Action" onClick={handleClick} />);

        fireEvent.keyDown(screen.getByRole('menuitem'), { key: ' ' });
        expect(handleClick).toHaveBeenCalled();
    });

    it('does not respond to keyboard when disabled', () => {
        const handleClick = vi.fn();
        render(<MenuItem label="Disabled" onClick={handleClick} disabled />);

        fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Enter' });
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies custom className', () => {
        render(<MenuItem label="Custom" className="my-item" />);
        expect(screen.getByRole('menuitem')).toHaveClass('my-item');
    });

    it('forwards ref to button element', () => {
        const ref = React.createRef();
        render(<MenuItem label="Ref" ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
});
