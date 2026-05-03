/**
 * @file ShortcutItem.jsx
 * @description Individual shortcut item component displaying action and key combination.
 * Renders keyboard keys as styled badges with platform-appropriate symbols.
 *
 * @example
 * <ShortcutItem
 *   action="Global Search"
 *   keys={['⌘', 'K']}
 *   description="Search everything"
 * />
 */

import React, { memo } from 'react';
import { getKeySymbol } from './shortcuts';

/**
 * @typedef {Object} ShortcutItemProps
 * @property {string} action - Action name
 * @property {string[]} keys - Key combination
 * @property {string} [description] - Optional description
 * @property {string} [className] - Additional CSS class
 */

/**
 * Renders a keyboard key badge
 * @param {Object} props - Component props
 * @param {string} props.keyName - Key to display
 * @returns {React.ReactElement} Keyboard key badge
 */
function KeyBadge({ keyName }) {
    const displayKey = getKeySymbol(keyName);
    const isSymbol = displayKey.length === 1 && /[⌘⇧⌥⌃␣⌫↵↑↓←→]/.test(displayKey);

    return (
        <kbd className={`kbd ${isSymbol ? 'kbd--symbol' : ''}`}>
            {displayKey}
        </kbd>
    );
}

/**
 * Renders a key combination with separator
 * @param {Object} props - Component props
 * @param {string[]} props.keys - Keys in the combination
 * @returns {React.ReactElement} Key combination display
 */
function KeyCombo({ keys }) {
    return (
        <span className="key-combo">
            {keys.map((key, index) => (
                <React.Fragment key={index}>
                    <KeyBadge keyName={key} />
                    {index < keys.length - 1 && (
                        <span className="key-combo__separator">+</span>
                    )}
                </React.Fragment>
            ))}
        </span>
    );
}

/**
 * Individual shortcut item component.
 *
 * @param {ShortcutItemProps} props - Component props
 * @returns {React.ReactElement} The rendered shortcut item
 */
function ShortcutItem({
    action,
    keys,
    description,
    className = ''
}) {
    const itemClassNames = [
        'shortcut-item',
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={itemClassNames}>
            <div className="shortcut-item__action">
                <span className="shortcut-item__label">{action}</span>
                {description && (
                    <span className="shortcut-item__description">{description}</span>
                )}
            </div>
            <div className="shortcut-item__keys">
                <KeyCombo keys={keys} />
            </div>
        </div>
    );
}

export default memo(ShortcutItem);
export { ShortcutItem, KeyBadge, KeyCombo };