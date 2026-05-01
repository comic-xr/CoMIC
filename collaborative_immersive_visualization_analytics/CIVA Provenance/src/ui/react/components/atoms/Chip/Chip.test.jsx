import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Chip } from './Chip';

// Mock the useAdaptive hook
vi.mock('@UI/react/context', () => ({
    useAdaptive: () => ({ isVR: false, mode: 'desktop' }),
}));

// Mock Icon component
vi.mock('@UI/react/components/atoms/Icon', () => ({
    Icon: ({ name, className }) => <span data-testid={`icon-${name}`} className={className} />,
}));

describe('Chip', () => {
    it('renders label text', () => {
        render(<Chip label="Tag" />);
        expect(screen.getByText('Tag')).toBeInTheDocument();
    });

    it('renders as span when not interactive', () => {
        const { container } = render(<Chip label="Static" />);
        expect(container.querySelector('span.chip')).toBeInTheDocument();
    });

    it('renders as button when onClick is provided', () => {
        render(<Chip label="Clickable" onClick={() => {}} />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
        const handleClick = vi.fn();
        render(<Chip label="Click me" onClick={handleClick} />);

        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalled();
    });

    it('does not call onClick when disabled', () => {
        const handleClick = vi.fn();
        // When disabled with onClick, the Chip is not interactive so it renders as span
        const { container } = render(<Chip label="Disabled" onClick={handleClick} disabled />);

        // Click on the chip (now a span since disabled makes it non-interactive)
        fireEvent.click(container.firstChild);
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('renders icon when icon prop is provided', () => {
        render(<Chip label="With Icon" icon="star" />);
        expect(screen.getByTestId('icon-star')).toBeInTheDocument();
    });

    it('applies selected class when selected', () => {
        const { container } = render(<Chip label="Selected" selected />);
        expect(container.firstChild).toHaveClass('chip--selected');
    });

    it('applies size class', () => {
        const { container } = render(<Chip label="Small" size="sm" />);
        expect(container.firstChild).toHaveClass('chip--sm');
    });

    it('applies custom color via CSS variable', () => {
        const { container } = render(<Chip label="Colored" color="#ff6600" />);
        expect(container.firstChild).toHaveStyle({ '--chip-color': '#ff6600' });
    });

    it('renders remove button when removable', () => {
        render(<Chip label="Removable" removable />);
        expect(screen.getByRole('button', { name: /remove removable/i })).toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', () => {
        const handleRemove = vi.fn();
        render(<Chip label="Remove me" removable onRemove={handleRemove} />);

        fireEvent.click(screen.getByRole('button', { name: /remove/i }));
        expect(handleRemove).toHaveBeenCalled();
    });

    it('remove button click does not trigger chip onClick', () => {
        const handleClick = vi.fn();
        const handleRemove = vi.fn();
        render(<Chip label="Test" onClick={handleClick} removable onRemove={handleRemove} />);

        fireEvent.click(screen.getByRole('button', { name: /remove/i }));
        expect(handleRemove).toHaveBeenCalled();
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('responds to keyboard Enter key when interactive', () => {
        const handleClick = vi.fn();
        render(<Chip label="Keyboard" onClick={handleClick} />);

        fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
        expect(handleClick).toHaveBeenCalled();
    });

    it('responds to keyboard Space key when interactive', () => {
        const handleClick = vi.fn();
        render(<Chip label="Keyboard" onClick={handleClick} />);

        fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
        expect(handleClick).toHaveBeenCalled();
    });

    it('applies custom className', () => {
        const { container } = render(<Chip label="Custom" className="my-chip" />);
        expect(container.firstChild).toHaveClass('my-chip');
    });

    it('applies disabled class when disabled', () => {
        const { container } = render(<Chip label="Disabled" disabled />);
        expect(container.firstChild).toHaveClass('chip--disabled');
    });
});
