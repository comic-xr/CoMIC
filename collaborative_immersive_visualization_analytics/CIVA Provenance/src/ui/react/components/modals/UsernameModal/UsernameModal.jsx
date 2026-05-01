/**
 * @file UsernameModal.jsx
 * @description Entry-point modal for username input with branded glassmorphism theme.
 *
 * This is a special modal shown at application entry before the user joins
 * the collaborative session. It has intentionally different styling from
 * in-app modals to create a branded "landing" experience.
 *
 * Features:
 * - Branded header with logo and app name
 * - Username validation (2-20 characters)
 * - Glassmorphism styling with accent glow
 * - Auto-focus on input
 *
 * Note: This component does NOT use the base Modal component because it has
 * unique branding requirements and appears before the main app loads.
 *
 * @example
 * <UsernameModal onSubmit={(username) => joinSession(username)} />
 */

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import './UsernameModal.scss';

/**
 * @typedef {Object} UsernameModalProps
 * @property {(username: string) => void} onSubmit - Callback with validated username
 */

/**
 * Entry-point modal for username input.
 * Shown at application entry before joining the collaborative session.
 *
 * @param {UsernameModalProps} props - Component props
 * @returns {React.ReactElement} The modal element
 */
export function UsernameModal({ onSubmit }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter a name");
      return;
    }

    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    if (trimmed.length > 20) {
      setError("Name must be 20 characters or less");
      return;
    }

    onSubmit(trimmed);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <div className="username-modal__overlay">
      <div className="username-modal">
        {/* Logo */}
        <div className="username-modal__header">
          <div className="username-modal__logo">
            <Icon name="user" size={32} />
          </div>
          <h1 className="username-modal__title">CIA Web</h1>
          <p className="username-modal__subtitle">
            Collaborative Immersive Analytics
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="username-modal__form">
          <div className="username-modal__field">
            <label
              htmlFor="username-input"
              className="username-modal__label"
            >
              Enter your display name
            </label>
            <input
              ref={inputRef}
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Sarah Chen"
              maxLength={20}
              className={`username-modal__input ${error ? "username-modal__input--error" : ""}`}
            />
            {error && (
              <div className="username-modal__error">
                {error}
              </div>
            )}
          </div>

          <LabeledButton
            label="Enter Web App"
            onClick={handleSubmit}
            variant="primary"
            className="username-modal__submit"
          />
        </form>

        {/* Hint */}
        <div className="username-modal__hint">
          Your teammates will see this name
        </div>
      </div>
    </div>
  );
}

export default UsernameModal;