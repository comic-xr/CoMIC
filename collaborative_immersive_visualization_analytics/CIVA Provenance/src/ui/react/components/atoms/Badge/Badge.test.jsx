import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Badge } from './Badge';

// Mock the useAdaptive hook
vi.mock('@UI/react/context', () => ({
    useAdaptive: () => ({ isVR: false, mode: 'desktop' }),
}));

describe('Badge', () => {
    it('renders children content', () => {
        render(<Badge>5</Badge>);
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders count prop', () => {
        render(<Badge count={10} />);
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('shows max+ when count exceeds max', () => {
        render(<Badge count={150} max={99} />);
        expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('renders as dot without content', () => {
        const { container } = render(<Badge dot />);
        const badge = container.firstChild;
        expect(badge).toHaveClass('badge--dot');
        expect(badge).toBeEmptyDOMElement();
    });

    it('applies color class for preset colors', () => {
        const { container } = render(<Badge color="danger">!</Badge>);
        expect(container.firstChild).toHaveClass('badge--color-danger');
    });

    it('applies custom color via CSS variable', () => {
        const { container } = render(<Badge color="#ff0000">!</Badge>);
        expect(container.firstChild).toHaveStyle({ '--badge-color': '#ff0000' });
    });

    it('applies size class', () => {
        const { container } = render(<Badge size="sm">1</Badge>);
        expect(container.firstChild).toHaveClass('badge--sm');
    });

    it('applies variant class', () => {
        const { container } = render(<Badge variant="outline">1</Badge>);
        expect(container.firstChild).toHaveClass('badge--outline');
    });

    it('applies pulse class when pulse prop is true', () => {
        const { container } = render(<Badge pulse>!</Badge>);
        expect(container.firstChild).toHaveClass('badge--pulse');
    });

    it('applies custom className', () => {
        const { container } = render(<Badge className="custom-class">1</Badge>);
        expect(container.firstChild).toHaveClass('custom-class');
    });
});
