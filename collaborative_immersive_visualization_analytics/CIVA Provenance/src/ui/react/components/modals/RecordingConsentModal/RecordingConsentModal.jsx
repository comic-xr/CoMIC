/**
 * @file RecordingConsentModal.jsx
 * @description Modal that appears when another user starts recording a session.
 * Requires the current user to acknowledge what's being recorded before continuing.
 *
 * Features:
 * - Cannot be dismissed with Escape or close button
 * - Shows recorder name and recording options
 * - Checklist of what's being recorded
 * - Leave Room or Continue actions
 * - Pulsing recording indicator animation
 * - Focus management on primary action
 *
 * @example
 * <RecordingConsentModal
 *   isOpen={showConsent}
 *   recorderName="John Doe"
 *   recordingOptions={{ screen: true, audio: true, webcam: false, chat: true }}
 *   onContinue={() => setShowConsent(false)}
 *   onLeave={leaveRoom}
 * />
 */

import React, { memo, useRef, useEffect, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { Modal } from '../Modal';
import './RecordingConsentModal.scss';

/**
 * Recording items configuration
 */
const RECORDING_ITEMS = [
    {
        key: 'screen',
        icon: 'monitor',
        label: 'Screen / Canvas activity',
        activeLabel: 'Recording',
        inactiveLabel: 'Not recording',
    },
    {
        key: 'audio',
        icon: 'mic',
        label: 'Voice audio',
        activeLabel: 'Recording',
        inactiveLabel: 'Not recording',
    },
    {
        key: 'webcam',
        icon: 'camera',
        label: 'Webcam video',
        activeLabel: 'Recording',
        inactiveLabel: 'Not recording',
    },
    {
        key: 'chat',
        icon: 'messageSquare',
        label: 'Chat messages',
        activeLabel: 'Recording',
        inactiveLabel: 'Not recording',
    },
];

/**
 * @typedef {Object} RecordingOptions
 * @property {boolean} screen - Recording screen/canvas activity
 * @property {boolean} audio - Recording voice audio
 * @property {boolean} webcam - Recording webcam video
 * @property {boolean} chat - Recording chat messages
 */

/**
 * @typedef {Object} RecordingConsentModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {string} recorderName - Name of user who started recording
 * @property {RecordingOptions} recordingOptions - What's being recorded
 * @property {() => void} onContinue - User accepts and continues
 * @property {() => void} onLeave - User leaves the room
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Recording item component showing what's being recorded.
 */
const RecordingItem = memo(function RecordingItem({
    icon,
    label,
    isActive,
    activeLabel,
    inactiveLabel
}) {
    const itemClassNames = [
        'recording-item',
        isActive ? 'recording-item--active' : 'recording-item--inactive'
    ].join(' ');

    return (
        <div className={itemClassNames} role="listitem">
            <span className="recording-item__icon" aria-hidden="true">
                <Icon name={isActive ? "check" : "close"} size={14} />
            </span>
            <span className="recording-item__type-icon" aria-hidden="true">
                <Icon name={icon} size={16} />
            </span>
            <span className="recording-item__label">{label}</span>
            <span className="recording-item__status">
                {isActive ? activeLabel : inactiveLabel}
            </span>
        </div>
    );
});

/**
 * Custom recording icon with pulse animation.
 */
const RecordingIcon = memo(function RecordingIcon() {
    return (
        <span className="recording-consent-modal__icon-wrapper">
            <span className="recording-dot" aria-hidden="true" />
            <Icon name="video" size={20} className="recording-consent-modal__icon" />
        </span>
    );
});

/**
 * Modal for recording consent acknowledgment.
 *
 * @param {RecordingConsentModalProps} props - Component props
 * @returns {React.ReactElement} The rendered modal
 */
function RecordingConsentModal({
    isOpen,
    recorderName,
    recordingOptions = {},
    onContinue,
    onLeave,
    className = '',
    testId
}) {
    // Ref for the continue button (primary action for focus)
    const continueButtonRef = useRef(null);

    /**
     * Focus the continue button when modal opens
     */
    useEffect(() => {
        if (isOpen) {
            // Small delay to ensure modal is rendered
            const timer = setTimeout(() => {
                continueButtonRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    /**
     * Handle keyboard events
     */
    const handleKeyDown = useCallback((event) => {
        // Trap focus between the two buttons
        if (event.key === 'Tab') {
            const focusableElements = event.currentTarget.querySelectorAll('button');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement?.focus();
                }
            }
        }
    }, []);

    /**
     * Handle continue click
     */
    const handleContinue = useCallback(() => {
        onContinue();
    }, [onContinue]);

    /**
     * Handle leave click
     */
    const handleLeave = useCallback(() => {
        onLeave();
    }, [onLeave]);

    // Count active recordings for screen reader
    const activeCount = Object.values(recordingOptions).filter(Boolean).length;

    // Build class names
    const contentClassNames = [
        'recording-consent-modal',
        className
    ].filter(Boolean).join(' ');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onContinue} // Required prop, but won't be used
            title="Recording Started"
            icon={RecordingIcon}
            severity="warning"
            size="sm"
            showCloseButton={false}
            closeOnEscape={false}
            closeOnBackdrop={false}
            testId={testId}
            footer={
                <div
                    className="recording-consent-modal__footer"
                    onKeyDown={handleKeyDown}
                    role="group"
                    aria-label="Recording consent actions"
                >
                    <LabeledButton
                        label="Leave Room"
                        onClick={handleLeave}
                        variant="ghost"
                        aria-label="Leave the room to avoid being recorded"
                    />
                    <LabeledButton
                        ref={continueButtonRef}
                        label="OK, Continue"
                        onClick={handleContinue}
                        variant="primary"
                        aria-label="Acknowledge recording and continue in session"
                    />
                </div>
            }
        >
            <div
                className={contentClassNames}
                role="alertdialog"
                aria-label={`Recording started by ${recorderName}`}
                aria-describedby="recording-description"
            >
                {/* Description */}
                <p
                    id="recording-description"
                    className="recording-consent-modal__description"
                >
                    <strong>{recorderName}</strong> has started recording this session.
                </p>

                {/* Divider */}
                <div className="recording-consent-modal__divider" aria-hidden="true" />

                {/* Section title */}
                <h3 className="recording-consent-modal__section-title">
                    What's being recorded:
                </h3>

                {/* Recording items checklist */}
                <div
                    className="recording-items"
                    role="list"
                    aria-label={`${activeCount} of ${RECORDING_ITEMS.length} items being recorded`}
                >
                    {RECORDING_ITEMS.map((item) => (
                        <RecordingItem
                            key={item.key}
                            icon={item.icon}
                            label={item.label}
                            isActive={recordingOptions[item.key] || false}
                            activeLabel={item.activeLabel}
                            inactiveLabel={item.inactiveLabel}
                        />
                    ))}
                </div>
            </div>
        </Modal>
    );
}

export default memo(RecordingConsentModal);
export { RecordingConsentModal, RECORDING_ITEMS };