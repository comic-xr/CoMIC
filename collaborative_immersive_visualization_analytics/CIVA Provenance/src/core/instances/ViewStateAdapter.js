// src/core/instances/ViewStateAdapter.js

import { instance as log } from "@Utils/logger.js";

/**
 * ViewStateAdapter
 *
 * This adapter separates state management from visualization logic.
 * The handler (VTK) publishes state changes without knowing about Y.js or collaboration.
 * The InstanceManager subscribes to these changes and handles synchronization.
 *
 * Think of it as a messenger: the handler gives messages to the adapter,
 * and the adapter delivers them to whoever's listening (InstanceManager).
 */
export class ViewStateAdapter {
  constructor(instanceId, handlerType) {
    this.instanceId = instanceId;
    this.handlerType = handlerType;

    // The current state - our source of truth
    this._state = {};

    // Functions that want to be notified when state changes
    this._observers = [];

    // Flag to prevent infinite loops when applying remote state
    this._applyingRemoteState = false;
  }

  /**
   * Handler calls this when its state changes
   * This is how VTK says "my camera moved" without knowing about Y.js
   */
  updateState(partialState, source = "local") {
    // Don't emit if we're currently applying remote state (prevents loops)
    if (this._applyingRemoteState) {
      return;
    }

    // Merge the new state with what we already have
    this._state = {
      ...this._state,
      ...partialState,
      lastUpdated: Date.now(),
      updatedBy: source,
    };

    // Tell everyone who's listening about the change
    this._notifyObservers({
      instanceId: this.instanceId,
      handlerType: this.handlerType,
      partialState, // Just what changed
      fullState: this._state, // Complete state
      source,
    });
  }

  /**
   * InstanceManager calls this to apply state from another user
   */
  applyRemoteState(remoteState, applyCallback) {
    // Set flag so we don't re-emit this change
    this._applyingRemoteState = true;

    try {
      // Let the handler apply the state to VTK
      applyCallback(remoteState);

      // Update our internal cache
      this._state = {
        ...this._state,
        ...remoteState,
      };
    } finally {
      // Always clear the flag, even if there was an error
      this._applyingRemoteState = false;
    }
  }

  /**
   * Get a copy of the current state
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Subscribe to state changes
   * Returns a function to unsubscribe
   */
  observe(callback) {
    this._observers.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this._observers.indexOf(callback);
      if (index > -1) {
        this._observers.splice(index, 1);
      }
    };
  }

  /**
   * Internal: notify all observers about a state change
   */
  _notifyObservers(stateUpdate) {
    this._observers.forEach((observer) => {
      try {
        observer(stateUpdate);
      } catch (error) {
        log.error("Error in state observer:", error);
      }
    });
  }

  /**
   * Clean up when instance is destroyed
   */
  destroy() {
    this._observers = [];
    this._state = {};
  }
}
