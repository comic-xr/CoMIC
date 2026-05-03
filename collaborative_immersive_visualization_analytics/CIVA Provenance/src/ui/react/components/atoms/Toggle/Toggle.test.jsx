import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Toggle } from './Toggle';

// Mock the useAdaptive hook
vi.mock('@UI/react/context', () => ({
    useAdaptive: () => ({ isVR: false, mode: 'desktop' }),
}));

describe('Toggle', () => {
    it('renders as a switch button', () => {
        render(<Toggle />);
        const toggle = screen.getByRole('switch');
        expect(toggle).toBeInTheDocument();
    });

    it('reflects checked state via aria-checked', () => {
        const { rerender } = render(<Toggle checked={false} />);
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

        rerender(<Toggle checked={true} />);
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('calls onChange with toggled value when clicked', () => {
        const handleChange = vi.fn();
        render(<Toggle checked={false} onChange={handleChange} />);

        fireEvent.click(screen.getByRole('switch'));
        expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('calls onChange with false when checked and clicked', () => {
        const handleChange = vi.fn();
        render(<Toggle checked={true} onChange={handleChange} />);

        fireEvent.click(screen.getByRole('switch'));
        expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('does not call onChange when disabled', () => {
        const handleChange = vi.fn();
        render(<Toggle disabled onChange={handleChange} />);

        fireEvent.click(screen.getByRole('switch'));
        expect(handleChange).not.toHaveBeenCalled();
    });

    it('applies disabled attribute when disabled', () => {
        render(<Toggle disabled />);
        expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('renders label when provided', () => {
        render(<Toggle label="Dark mode" />);
        expect(screen.getByText('Dark mode')).toBeInTheDocument();
    });

    it('renders label on the left when labelPosition is left', () => {
        const { container } = render(<Toggle label="Option" labelPosition="left" />);
        const wrapper = container.querySelector('.toggle-wrapper');
        expect(wrapper).toHaveClass('toggle-wrapper--left');
    });

    it('applies size class', () => {
        render(<Toggle size="sm" />);
        expect(screen.getByRole('switch')).toHaveClass('toggle--sm');
    });

    it('applies checked class when checked', () => {
        render(<Toggle checked />);
        expect(screen.getByRole('switch')).toHaveClass('toggle--checked');
    });

    it('applies custom color when checked', () => {
        render(<Toggle checked color="#00ff00" />);
        expect(screen.getByRole('switch')).toHaveStyle({ '--toggle-active-color': '#00ff00' });
    });

    it('responds to keyboard Enter key', () => {
        const handleChange = vi.fn();
        render(<Toggle checked={false} onChange={handleChange} />);

        fireEvent.keyDown(screen.getByRole('switch'), { key: 'Enter' });
        expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('responds to keyboard Space key', () => {
        const handleChange = vi.fn();
        render(<Toggle checked={false} onChange={handleChange} />);

        fireEvent.keyDown(screen.getByRole('switch'), { key: ' ' });
        expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('clicking label toggles the switch', () => {
        const handleChange = vi.fn();
        render(<Toggle checked={false} onChange={handleChange} label="Test" />);

        fireEvent.click(screen.getByText('Test'));
        expect(handleChange).toHaveBeenCalledWith(true);
    });
});
