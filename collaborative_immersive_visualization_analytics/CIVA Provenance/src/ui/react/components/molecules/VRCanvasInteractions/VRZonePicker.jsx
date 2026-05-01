/**
 * @file VRZonePicker.jsx
 * @description Zone selection panel for VR canvas placement.
 * Shows when placing into an occupied cell.
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useTransfer, DROP_ZONES } from './TransferContext';
import './VRCanvasInteractions.scss';

// Zone configuration
const ZONES = [
    {
        id: DROP_ZONES.SWAP,
        icon: 'repeat',
        label: 'Replace',
        desc: 'Swap with existing view',
        colorClass: 'swap',
    },
    {
        id: DROP_ZONES.PUSH_UP,
        icon: 'arrowUp',
        label: 'Push Up',
        desc: 'Insert above',
        colorClass: 'push',
    },
    {
        id: DROP_ZONES.PUSH_DOWN,
        icon: 'arrowDown',
        label: 'Push Down',
        desc: 'Insert below',
        colorClass: 'push',
    },
    {
        id: DROP_ZONES.PUSH_LEFT,
        icon: 'arrowLeft',
        label: 'Push Left',
        desc: 'Insert to left',
        colorClass: 'push',
    },
    {
        id: DROP_ZONES.PUSH_RIGHT,
        icon: 'arrowRight',
        label: 'Push Right',
        desc: 'Insert to right',
        colorClass: 'push',
    },
];

/**
 * VRZonePicker - Zone selection panel for occupied cells
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether picker is visible
 * @param {Function} props.onClose - Close handler
 * @param {string} [props.existingViewName] - Name of existing view in cell
 * @param {string} [props.existingViewColor] - Color of existing view
 */
export const VRZonePicker = memo(function VRZonePicker({
    isOpen,
    onClose,
    existingViewName,
    existingViewColor,
}) {
    const {
        selectedZone,
        setSelectedZone,
        modifiers,
        toggleModifier,
        confirmTransfer,
    } = useTransfer();

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="vr-zone-picker__backdrop" onClick={onClose} />

            {/* Panel */}
            <div className="vr-zone-picker">
                {/* Header */}
                <div className="vr-zone-picker__header">
                    <div className="vr-zone-picker__title">Placement Options</div>
                    <div className="vr-zone-picker__existing">
                        <span>Cell contains:</span>
                        <span className="vr-zone-picker__existing-view">
                            <span
                                className="vr-zone-picker__existing-dot"
                                style={{ background: existingViewColor || '#60a5fa' }}
                            />
                            {existingViewName || 'Existing view'}
                        </span>
                    </div>
                </div>

                {/* Zone buttons */}
                <div className="vr-zone-picker__zones">
                    {ZONES.map((zone) => (
                        <button
                            key={zone.id}
                            onClick={() => setSelectedZone(zone.id)}
                            className={`vr-zone-picker__zone-btn vr-zone-picker__zone-btn--${zone.colorClass} ${
                                selectedZone === zone.id
                                    ? 'vr-zone-picker__zone-btn--selected'
                                    : ''
                            }`}
                        >
                            <Icon name={zone.icon} size={24} />
                            <div className="vr-zone-picker__zone-info">
                                <div className="vr-zone-picker__zone-label">
                                    {zone.label}
                                </div>
                                <div className="vr-zone-picker__zone-desc">
                                    {zone.desc}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Modifier toggles */}
                <div className="vr-zone-picker__modifiers">
                    <div className="vr-zone-picker__modifiers-label">
                        Additional Options
                    </div>

                    <ModifierToggle
                        label="Wrap to next row"
                        hint="Desktop: Hold Shift"
                        isActive={modifiers.wrap}
                        onToggle={() => toggleModifier('wrap')}
                    />
                    <ModifierToggle
                        label="Close last view"
                        hint="Desktop: Hold Ctrl/Cmd"
                        isActive={modifiers.closeOther}
                        onToggle={() => toggleModifier('closeOther')}
                    />
                    <ModifierToggle
                        label="Create linked view"
                        hint="Desktop: Hold Alt/Option"
                        isActive={modifiers.createLinked}
                        onToggle={() => toggleModifier('createLinked')}
                    />
                </div>

                {/* Actions */}
                <div className="vr-zone-picker__actions">
                    <button
                        onClick={onClose}
                        className="vr-zone-picker__btn vr-zone-picker__btn--cancel"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmTransfer}
                        className="vr-zone-picker__btn vr-zone-picker__btn--confirm"
                    >
                        Place View
                    </button>
                </div>
            </div>
        </>
    );
});

/**
 * ModifierToggle - Toggle switch for modifier options
 */
const ModifierToggle = memo(function ModifierToggle({
    label,
    hint,
    isActive,
    onToggle,
}) {
    return (
        <button
            onClick={onToggle}
            className={`vr-modifier-toggle ${
                isActive ? 'vr-modifier-toggle--active' : ''
            }`}
        >
            <div className="vr-modifier-toggle__info">
                <div className="vr-modifier-toggle__label">{label}</div>
                <div className="vr-modifier-toggle__hint">{hint}</div>
            </div>
            <div className="vr-modifier-toggle__switch">
                <div className="vr-modifier-toggle__knob" />
            </div>
        </button>
    );
});

export default VRZonePicker;
