/**
 * Type definitions for ui module
 */

export interface ComponentProps {
  [key: string]: unknown;
}

export interface PanelProps extends ComponentProps {
  title: string;
  onClose?: () => void;
}

export interface ButtonProps extends ComponentProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface SelectProps extends ComponentProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}
