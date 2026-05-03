/**
 * @file AnnotationModal.jsx
 * @description Modal dialog for creating annotations on 3D data.
 *
 * This is a simpler alternative to FloatingAnnotationCreator for basic
 * annotation creation. It provides type selection and text input in a
 * centered modal dialog.
 *
 * Features:
 * - Annotation type selection (note, warning, info, measurement)
 * - Text input with keyboard shortcuts
 * - Optional "don't show again" checkbox for instructions
 * - Position display showing 3D coordinates
 *
 * @example
 * <AnnotationModal
 *     isOpen={showModal}
 *     onClose={() => setShowModal(false)}
 *     onSubmit={(text, type) => createAnnotation(text, type)}
 *     position={{ x: 1.5, y: 2.3, z: -0.8 }}
 * />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '@UI/react/components/modals/Modal';
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import './AnnotationModal.scss';

/**
 * Annotation type configuration
 * @type {Array<{value: string, label: string, color: string, icon: string}>}
 */
const ANNOTATION_TYPES = [
  { value: 'note', label: 'Note', color: 'note', icon: 'note' },
  { value: 'warning', label: 'Warning', color: 'warning', icon: 'warning' },
  { value: 'info', label: 'Info', color: 'info', icon: 'info' },
  { value: 'measurement', label: 'Measure', color: 'measurement', icon: 'ruler' },
];

/**
 * @typedef {Object} AnnotationModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Callback when modal should close
 * @property {(text: string, type: string) => void} onSubmit - Callback with annotation text and type
 * @property {{x: number, y: number, z: number}} [position] - 3D position for the annotation
 */

/**
 * Modal dialog for creating annotations on 3D data.
 *
 * @param {AnnotationModalProps} props - Component props
 * @returns {React.ReactElement|null} The modal element or null if closed
 */
export function AnnotationModal({
  isOpen,
  onClose,
  onSubmit,
  position
}) {
  const [text, setText] = useState('');
  const [type, setType] = useState('note');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure modal animation completes
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setText('');
      setType('note');
    }
  }, [isOpen]);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(() => {
    if (!text.trim()) {
      return;
    }

    if (dontShowAgain) {
      localStorage.setItem('annotation_skip_instructions', 'true');
    }

    onSubmit(text.trim(), type);
    setText('');
    setType('note');
    setDontShowAgain(false);
  }, [text, type, dontShowAgain, onSubmit]);

  /**
   * Handles keyboard shortcuts
   * @param {React.KeyboardEvent} e - Keyboard event
   */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  /**
   * Formats a coordinate value for display
   * @param {number} value - Coordinate value
   * @returns {string} Formatted value
   */
  const formatCoord = (value) => {
    return typeof value === 'number' ? value.toFixed(2) : '0.00';
  };

  // Render footer with submit button
  const renderFooter = () => (
    <>
      <button
        className="btn btn--secondary"
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        className="btn btn--primary"
        onClick={handleSubmit}
        disabled={!text.trim()}
      >
        <Icon name="mapPin" size={14} />
        Create Annotation
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Annotation"
      icon={getIconComponent('mapPin')}
      size="sm"
      footer={renderFooter()}
    >
      <div className="annotation-modal">
        {/* Position display */}
        {position && (
          <div className="annotation-modal__position">
            <span className="label">Position:</span>
            <span className="coord">
              <span>X</span> {formatCoord(position.x)}
            </span>
            <span className="coord">
              <span>Y</span> {formatCoord(position.y)}
            </span>
            <span className="coord">
              <span>Z</span> {formatCoord(position.z)}
            </span>
          </div>
        )}

        {/* Type selection */}
        <div className="annotation-modal__types">
          {ANNOTATION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`annotation-modal__type annotation-modal__type--${t.color} ${type === t.value ? 'annotation-modal__type--active' : ''
                }`}
              onClick={() => setType(t.value)}
            >
              <span className="annotation-modal__type-icon"><Icon name={t.icon} size={14} /></span>
              <span className="annotation-modal__type-label">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="annotation-modal__input-wrapper">
          <label
            htmlFor="annotation-text"
            className="annotation-modal__input-label"
          >
            Annotation Text
          </label>
          <textarea
            ref={inputRef}
            id="annotation-text"
            className="annotation-modal__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter annotation text..."
            rows={4}
          />
        </div>

        {/* Don't show again checkbox */}
        <div className="annotation-modal__checkbox-wrapper">
          <input
            type="checkbox"
            id="dont-show-again"
            className="annotation-modal__checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          <label
            htmlFor="dont-show-again"
            className="annotation-modal__checkbox-label"
          >
            Don't show instructions again
          </label>
        </div>

        {/* Keyboard hint */}
        <div className="annotation-modal__hint">
          <span><kbd>Enter</kbd> to create</span>
          <span><kbd>Shift+Enter</kbd> for new line</span>
          <span><kbd>Esc</kbd> to cancel</span>
        </div>
      </div>
    </Modal>
  );
}

export default AnnotationModal;