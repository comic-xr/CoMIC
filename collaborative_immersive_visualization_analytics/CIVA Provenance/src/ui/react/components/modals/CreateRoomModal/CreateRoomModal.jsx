/**
 * @file CreateRoomModal.jsx
 * @description Modal for creating breakout rooms with full configuration options.
 * Uses the base FormModal component for consistent styling and behavior.
 *
 * Features:
 * - Room name and description fields
 * - Feature toggles (text, voice, workspace)
 * - Access level selection (open, invite, invisible)
 * - Persistence selection (session, persistent)
 * - User invitation for non-open rooms
 *
 * @example
 * <CreateRoomModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onCreate={handleCreate}
 *   availableUsers={users}
 * />
 */

import React, { useState, useCallback, useEffect } from "react";
import { Icon, getIconComponent } from '@UI/react/components/atoms/Icon';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';

import { FormModal } from "@UI/react/components/modals/FormModal";
import { FormField } from "@UI/react/components/modals/FormModal";
import { UserAvatar } from "@UI/react/components/atoms/UserAvatar";

import "./CreateRoomModal.scss";

// =============================================================================
// CONFIGURATION OPTIONS
// =============================================================================

const ACCESS_OPTIONS = [
    {
        id: "open",
        icon: 'unlock',
        label: "Open",
        description: "Anyone can join"
    },
    {
        id: "invite",
        icon: 'lock',
        label: "Invite Only",
        description: "Only invited users can join"
    },
    {
        id: "invisible",
        icon: 'eyeOff',
        label: "Invisible",
        description: "Hidden from non-members"
    },
];

const PERSISTENCE_OPTIONS = [
    {
        id: "session",
        icon: 'clock',
        label: "Session",
        description: "Temporary - closes when empty"
    },
    {
        id: "persistent",
        icon: 'save',
        label: "Persistent",
        description: "Stays open for future use"
    },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CreateRoomModal({
    isOpen,
    onClose,
    onCreate,
    availableUsers = []
}) {
    // ---------------------------------------------------------------------------
    // STATE
    // ---------------------------------------------------------------------------

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // Features
    const [hasText, setHasText] = useState(true);
    const [hasVoice, setHasVoice] = useState(false);
    const [hasWorkspace, setHasWorkspace] = useState(false);

    // Access & persistence
    const [access, setAccess] = useState("open");
    const [persistence, setPersistence] = useState("session");

    // Initial invites
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);

    // Validation & submission
    const [errors, setErrors] = useState({});
    const [isCreating, setIsCreating] = useState(false);

    // ---------------------------------------------------------------------------
    // RESET STATE ON OPEN
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (isOpen) {
            setName("");
            setDescription("");
            setHasText(true);
            setHasVoice(false);
            setHasWorkspace(false);
            setAccess("open");
            setPersistence("session");
            setSearchQuery("");
            setSelectedUsers([]);
            setErrors({});
            setIsCreating(false);
        }
    }, [isOpen]);

    // ---------------------------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------------------------

    const validate = useCallback(() => {
        const newErrors = {};

        if (!name.trim()) {
            newErrors.name = "Room name is required";
        } else if (name.length > 50) {
            newErrors.name = "Room name must be under 50 characters";
        }

        if (description.length > 200) {
            newErrors.description = "Description must be under 200 characters";
        }

        if (!hasText && !hasVoice && !hasWorkspace) {
            newErrors.features = "Select at least one feature";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [name, description, hasText, hasVoice, hasWorkspace]);

    // ---------------------------------------------------------------------------
    // HANDLERS
    // ---------------------------------------------------------------------------

    const handleSubmit = useCallback(async () => {
        if (!validate()) return;

        setIsCreating(true);

        try {
            await onCreate({
                name: name.trim(),
                description: description.trim(),
                hasText,
                hasVoice,
                hasWorkspace,
                access,
                isPersistent: persistence === "persistent",
                initialMembers: selectedUsers,
                autoJoin: true,
            });
            onClose();
        } catch (error) {
            setErrors({ submit: error.message || "Failed to create room" });
        } finally {
            setIsCreating(false);
        }
    }, [
        validate, name, description, hasText, hasVoice, hasWorkspace,
        access, persistence, selectedUsers, onCreate, onClose
    ]);

    const toggleUserSelection = useCallback((user) => {
        setSelectedUsers(prev => {
            const exists = prev.find(u => u.odbc === user.odbc || u.clientId === user.clientId);
            if (exists) {
                return prev.filter(u => u.odbc !== user.odbc && u.clientId !== user.clientId);
            }
            return [...prev, user];
        });
    }, []);

    const isUserSelected = useCallback((user) => {
        return selectedUsers.some(u => u.odbc === user.odbc || u.clientId === user.clientId);
    }, [selectedUsers]);

    // Filter users for invite list
    const filteredUsers = availableUsers.filter(user => {
        if (user.isYou) return false; // Can't invite yourself
        if (!searchQuery) return true;
        return user.userName?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Breakout Room"
            icon="users"
            submitLabel="Create Room"
            onSubmit={handleSubmit}
            isSubmitting={isCreating}
            submittingLabel="Creating..."
            submitDisabled={!name.trim()}
        >
            <div className="create-room-modal__content">
                {/* Submit error */}
                {errors.submit && (
                    <div className="create-room-modal__submit-error">
                        <AlertCircle size={14} />
                        {errors.submit}
                    </div>
                )}

                {/* Name */}
                <FormField
                    name="name"
                    label="Room Name"
                    type="text"
                    required
                    autoFocus
                    maxLength={50}
                    value={name}
                    onChange={setName}
                    placeholder="e.g., Data Analysis Team"
                    error={errors.name}
                />

                {/* Description */}
                <FormField
                    name="description"
                    label="Description"
                    type="text"
                    maxLength={200}
                    value={description}
                    onChange={setDescription}
                    placeholder="What's this room for?"
                    error={errors.description}
                    helpText="Optional"
                />

                {/* Features */}
                <div className="create-room-modal__section">
                    <label className="create-room-modal__section-label">Features</label>
                    <div className="create-room-modal__toggles">
                        <button
                            type="button"
                            className={`create-room-modal__toggle ${hasText ? "active" : ""}`}
                            onClick={() => setHasText(!hasText)}
                        >
                            <Icon name="messageSquare" size={16} />
                            <span>Text Chat</span>
                        </button>
                        <button
                            type="button"
                            className={`create-room-modal__toggle ${hasVoice ? "active" : ""}`}
                            onClick={() => setHasVoice(!hasVoice)}
                        >
                            <Icon name="mic" size={16} />
                            <span>Voice</span>
                        </button>
                        <button
                            type="button"
                            className={`create-room-modal__toggle ${hasWorkspace ? "active" : ""}`}
                            onClick={() => setHasWorkspace(!hasWorkspace)}
                        >
                            <Icon name="layout" size={16} />
                            <span>Workspace</span>
                        </button>
                    </div>
                    {errors.features && (
                        <span className="create-room-modal__error">
                            <Icon name="alertCircle" size={12} /> {errors.features}
                        </span>
                    )}
                </div>

                {/* Access Level */}
                <div className="create-room-modal__section">
                    <label className="create-room-modal__section-label">Access</label>
                    <div className="create-room-modal__options">
                        {ACCESS_OPTIONS.map(option => {
                            const IconComponent = option.icon;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`create-room-modal__option ${access === option.id ? "active" : ""}`}
                                    onClick={() => setAccess(option.id)}
                                >
                                    <IconComponent size={16} />
                                    <div className="create-room-modal__option-text">
                                        <span className="create-room-modal__option-label">{option.label}</span>
                                        <span className="create-room-modal__option-desc">{option.description}</span>
                                    </div>
                                    {access === option.id && <Icon name="check" size={16} className="create-room-modal__check" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Persistence */}
                <div className="create-room-modal__section">
                    <label className="create-room-modal__section-label">Duration</label>
                    <div className="create-room-modal__options">
                        {PERSISTENCE_OPTIONS.map(option => {
                            const IconComponent = option.icon;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`create-room-modal__option ${persistence === option.id ? "active" : ""}`}
                                    onClick={() => setPersistence(option.id)}
                                >
                                    <IconComponent size={16} />
                                    <div className="create-room-modal__option-text">
                                        <span className="create-room-modal__option-label">{option.label}</span>
                                        <span className="create-room-modal__option-desc">{option.description}</span>
                                    </div>
                                    {persistence === option.id && <Icon name="check" size={16} className="create-room-modal__check" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Initial Invites (only show for non-open rooms) */}
                {access !== "open" && (
                    <div className="create-room-modal__section">
                        <label className="create-room-modal__section-label">
                            <Icon name="users" size={14} />
                            Invite Users
                        </label>
                        <SearchInput
                            className="create-room-modal__user-search"
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search users to invite..."
                            size="sm"
                        />

                        {/* Selected users */}
                        {selectedUsers.length > 0 && (
                            <div className="create-room-modal__selected-users">
                                {selectedUsers.map(user => (
                                    <button
                                        key={user.clientId || user.odbc}
                                        type="button"
                                        className="create-room-modal__selected-chip"
                                        onClick={() => toggleUserSelection(user)}
                                    >
                                        <UserAvatar userName={user.userName} color={user.userColor} size="xs" />
                                        <span>{user.userName}</span>
                                        <span className="create-room-modal__chip-remove">×</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* User list */}
                        <div className="create-room-modal__user-list">
                            {filteredUsers.length === 0 ? (
                                <div className="create-room-modal__no-users">
                                    {searchQuery ? "No users match your search" : "No users available to invite"}
                                </div>
                            ) : (
                                filteredUsers.map(user => (
                                    <button
                                        key={user.clientId || user.odbc}
                                        type="button"
                                        className={`create-room-modal__user-item ${isUserSelected(user) ? "selected" : ""}`}
                                        onClick={() => toggleUserSelection(user)}
                                    >
                                        <UserAvatar userName={user.userName} color={user.userColor} size="sm" />
                                        <span>{user.userName}</span>
                                        {isUserSelected(user) && <Icon name="check" size={14} className="create-room-modal__user-check" />}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </FormModal>
    );
}

export default CreateRoomModal;
