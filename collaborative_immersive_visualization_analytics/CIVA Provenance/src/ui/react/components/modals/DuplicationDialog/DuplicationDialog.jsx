/**
 * @file DuplicationDialog.jsx
 * @description Duplication dialog for ViewGroups with link handling options.
 *
 * Shows when user duplicates a ViewGroup that has active links,
 * allowing them to choose how links should be handled in the copy.
 *
 * Options:
 * - Keep individual links: Copy inherits same link targets
 * - Link to original (RECOMMENDED): New group syncs with original ViewGroup
 * - No links: Start fresh, configure manually
 *
 * @example
 * <DuplicationDialog
 *   isOpen={isOpen}
 *   onClose={close}
 *   viewGroup={viewGroupToDuplicate}
 *   linkStats={linkStats}
 *   onConfirm={handleDuplicate}
 * />
 */

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal } from '../Modal';
import { Icon } from '@UI/react/components/atoms/Icon';
import { LINK_PROPERTIES } from '@UI/react/components/organisms/Footer2/Footer2.logic';
import './DuplicationDialog.scss';

/**
 * Link option configurations
 */
const LINK_OPTIONS = [
    {
        id: 'keepIndividual',
        label: 'Keep individual links',
        description: 'Copy inherits same link targets (retained if ViewGroup link is later broken)',
        icon: 'copy',
    },
    {
        id: 'linkToOriginal',
        label: 'Link to original',
        description: 'New group syncs with original ViewGroup',
        icon: 'link',
        recommended: true,
    },
    {
        id: 'noLinks',
        label: 'No links',
        description: 'Start fresh, configure manually',
        icon: 'linkOff',
    },
];

/**
 * Active link badges display
 */
function ActiveLinkBadges({ linkStats }) {
    const activeLinks = LINK_PROPERTIES.filter(prop => linkStats[prop.id]?.count > 0);

    if (activeLinks.length === 0) return null;

    return (
        <div className="duplication-dialog__link-badges">
            {activeLinks.map(prop => (
                <span
                    key={prop.id}
                    className="duplication-dialog__link-badge"
                    style={{ '--badge-color': prop.color }}
                >
                    <Icon name={prop.icon} size={12} />
                    <span>{prop.label}</span>
                    <span className="duplication-dialog__link-badge-count">
                        ({linkStats[prop.id].count})
                    </span>
                </span>
            ))}
        </div>
    );
}

ActiveLinkBadges.propTypes = {
    linkStats: PropTypes.object.isRequired,
};

/**
 * Radio option component
 */
function LinkOption({ option, isSelected, onChange }) {
    return (
        <label
            className={`duplication-dialog__option ${isSelected ? 'duplication-dialog__option--selected' : ''}`}
        >
            <input
                type="radio"
                name="linkOption"
                value={option.id}
                checked={isSelected}
                onChange={() => onChange(option.id)}
                className="duplication-dialog__radio"
            />
            <div className="duplication-dialog__option-content">
                <div className="duplication-dialog__option-header">
                    <span className="duplication-dialog__option-label">
                        {option.label}
                    </span>
                    {option.recommended && (
                        <span className="duplication-dialog__recommended-badge">
                            RECOMMENDED
                        </span>
                    )}
                </div>
                <span className="duplication-dialog__option-description">
                    {option.description}
                </span>
            </div>
        </label>
    );
}

LinkOption.propTypes = {
    option: PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        icon: PropTypes.string,
        recommended: PropTypes.bool,
    }).isRequired,
    isSelected: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
};

/**
 * DuplicationDialog - Main component
 */
function DuplicationDialog({
    isOpen,
    onClose,
    viewGroup,
    linkStats = {},
    onConfirm,
    testId,
}) {
    const [selectedOption, setSelectedOption] = useState('linkToOriginal');

    // Reset to default when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSelectedOption('linkToOriginal');
        }
    }, [isOpen]);

    const handleConfirm = useCallback(() => {
        onConfirm?.(selectedOption);
        onClose();
    }, [selectedOption, onConfirm, onClose]);

    const handleCancel = useCallback(() => {
        onClose();
    }, [onClose]);

    // Check if there are active links
    const hasActiveLinks = Object.values(linkStats).some(stat => stat?.count > 0);
    const viewGroupName = viewGroup?.name || 'ViewGroup';

    const renderFooter = () => (
        <>
            <button
                type="button"
                className="btn btn--secondary"
                onClick={handleCancel}
                data-testid={testId ? `${testId}-cancel` : undefined}
            >
                Cancel
            </button>
            <button
                type="button"
                className="btn btn--primary"
                onClick={handleConfirm}
                data-testid={testId ? `${testId}-confirm` : undefined}
            >
                Duplicate
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Duplicate "${viewGroupName}"`}
            icon="copy"
            severity="info"
            size="md"
            closeOnBackdrop={true}
            footer={renderFooter()}
            testId={testId}
        >
            <div className="duplication-dialog">
                {hasActiveLinks ? (
                    <>
                        <p className="duplication-dialog__intro">
                            This ViewGroup has links to:
                        </p>

                        <ActiveLinkBadges linkStats={linkStats} />

                        <p className="duplication-dialog__question">
                            How should we handle links?
                        </p>

                        <div className="duplication-dialog__options">
                            {LINK_OPTIONS.map(option => (
                                <LinkOption
                                    key={option.id}
                                    option={option}
                                    isSelected={selectedOption === option.id}
                                    onChange={setSelectedOption}
                                />
                            ))}
                        </div>

                        {selectedOption === 'linkToOriginal' && (
                            <div className="duplication-dialog__warning">
                                <Icon name="info" size={14} />
                                <span>
                                    Individual links will be retained but temporarily disabled
                                    while ViewGroup linking is active.
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="duplication-dialog__no-links">
                        This ViewGroup has no active links. The duplicate will be created
                        as an independent copy.
                    </p>
                )}
            </div>
        </Modal>
    );
}

DuplicationDialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    viewGroup: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string,
    }),
    linkStats: PropTypes.object,
    onConfirm: PropTypes.func,
    testId: PropTypes.string,
};

export { DuplicationDialog };
export default DuplicationDialog;
