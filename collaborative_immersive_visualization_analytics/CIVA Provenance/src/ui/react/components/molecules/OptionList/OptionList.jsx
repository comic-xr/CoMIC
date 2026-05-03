/**
 * OptionList Component
 *
 * Selectable list for single/multi-select options, adapts for VR/desktop.
 */
import React from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/atoms/Icon';
import './OptionList.scss';

export const OptionList = ({
    options = [],
    value,
    onChange,
    multiple = false,
    disabled = false,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useAdaptive();

    // Derive padding from gap (similar to original adaptive tokens ratio)
    const padding = Math.round(tokens.gap * 1.5);

    const listStyle = {
        '--item-height': `${tokens.buttonHeight}px`,
        '--padding': `${padding}px`,
        '--gap': `${tokens.gap}px`,
        '--font-size': `${tokens.fontSize}px`,
    };

    const isSelected = (optionValue) => {
        if (multiple) {
            return Array.isArray(value) && value.includes(optionValue);
        }
        return value === optionValue;
    };

    const handleSelect = (optionValue) => {
        if (disabled) return;

        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            const newValues = currentValues.includes(optionValue)
                ? currentValues.filter(v => v !== optionValue)
                : [...currentValues, optionValue];
            onChange?.(newValues);
        } else {
            onChange?.(optionValue);
        }
    };

    return (
        <div
            className={`option-list option-list--${mode} ${disabled ? 'option-list--disabled' : ''} ${className}`.trim()}
            style={listStyle}
            role="listbox"
            aria-multiselectable={multiple}
            {...props}
        >
            {options.map((option) => {
                const selected = isSelected(option.value);
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        disabled={option.disabled || disabled}
                        className={`option-list__item ${selected ? 'option-list__item--selected' : ''}`.trim()}
                        onClick={() => handleSelect(option.value)}
                    >
                        {option.icon && (
                            <Icon name={option.icon} size={tokens.iconSize} />
                        )}
                        <span className="option-list__label">{option.label}</span>
                        {selected && (
                            <Icon
                                name="check"
                                size={tokens.iconSize}
                                className="option-list__check"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default OptionList;
