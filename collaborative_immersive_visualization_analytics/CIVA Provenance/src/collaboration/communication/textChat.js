// ----------------------------------------------------------------------------
// Text Chat System (Yjs-based)
// ----------------------------------------------------------------------------

import {
  getUserId,
  getUserName,
  getUserEmail,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";
import { generateTextChatId } from "@Utils/idGenerator.js";
import { sync as log } from "@Utils/logger.js";

class TextChat {
  constructor() {
    this.messages = null;
    this.messageListeners = [];
    this.clearListeners = [];
    this.deleteListeners = [];
    this.maxMessages = 100;
    this._initialized = false;
    this.currentRoomId = null;
    this.observeHandler = null;
  }

  initialize(roomId = 'global') {
    this._initialized = true;
    this.setRoom(roomId);
    log.debug("Text chat initialized for room:", roomId);
  }

  setRoom(roomId) {
    // If switching to the same room, do nothing
    if (this.currentRoomId === roomId && this.messages) {
      return;
    }

    log.info("Switching chat to room:", roomId);

    // Unobserve old array
    if (this.messages && this.observeHandler) {
      this.messages.unobserve(this.observeHandler);
    }

    // Set new room
    this.currentRoomId = roomId;

    // Get Y.js array for this specific room
    const arrayName = `chatMessages_${roomId}`;
    this.messages = ydoc.getArray(arrayName);

    // Create observer handler
    this.observeHandler = (event) => {
      // Check what changed
      event.changes.delta.forEach((change) => {
        // New messages added
        if (change.insert) {
          change.insert.forEach((message) => {
            this.notifyListeners(message);
          });
        }

        // Messages deleted
        if (change.delete) {
          // Notify that messages were deleted
          this.notifyDeleteListeners();
        }

        // Messages retained (no action needed)
        if (change.retain) {
          // No action needed
        }
      });

      // If entire array was cleared
      if (
        this.messages.length === 0 &&
        event.changes.delta.some((d) => d.delete)
      ) {
        this.notifyClearListeners();
      }
    };

    // Attach observer
    this.messages.observe(this.observeHandler);

    // Notify listeners that room changed (they should refresh)
    this.notifyDeleteListeners();
  }

  getCurrentRoomId() {
    return this.currentRoomId;
  }

  sendMessage(text) {
    if (!text || !text.trim()) {
      return;
    }

    const message = {
      id: generateTextChatId(),
      userId: getUserId(),
      userEmail: getUserEmail(), // Store email for more robust ownership checks
      userName: getUserName(),
      userColor: getUserColor(getUserId()),
      text: text.trim(),
      timestamp: Date.now(),
    };

    this.messages.push([message]);

    // Limit message history
    if (this.messages.length > this.maxMessages) {
      this.messages.delete(0, this.messages.length - this.maxMessages);
    }

    return message;
  }

  getMessages() {
    if (!this.messages) return [];
    return this.messages.toArray();
  }

  clearMessages() {
    if (this.messages) {
      this.messages.delete(0, this.messages.length);
    }
  }

  deleteMessage(messageId) {
    if (!this.messages) return false;

    const messages = this.messages.toArray();
    const index = messages.findIndex((msg) => msg.id === messageId);

    if (index !== -1) {
      this.messages.delete(index, 1);
      log.debug("Message deleted:", messageId);
      return true;
    }
    return false;
  }

  editMessage(messageId, newText) {
    if (!this.messages || !newText?.trim()) return false;

    const messages = this.messages.toArray();
    const index = messages.findIndex((msg) => msg.id === messageId);

    if (index !== -1) {
      const originalMessage = messages[index];
      const updatedMessage = {
        ...originalMessage,
        text: newText.trim(),
        editedAt: Date.now(),
        isEdited: true,
      };

      // Y.js arrays don't have a direct update method, so we delete and re-insert
      this.messages.delete(index, 1);
      this.messages.insert(index, [updatedMessage]);

      log.debug("Message edited:", messageId);
      return true;
    }
    return false;
  }

  onMessage(callback) {
    this.messageListeners.push(callback);
  }

  // ✅ NEW: Add cleanup method
  offMessage(callback) {
    const index = this.messageListeners.indexOf(callback);
    if (index > -1) {
      this.messageListeners.splice(index, 1);
    }
  }

  onClear(callback) {
    this.clearListeners.push(callback);
  }

  // ✅ NEW: Add cleanup method
  offClear(callback) {
    const index = this.clearListeners.indexOf(callback);
    if (index > -1) {
      this.clearListeners.splice(index, 1);
    }
  }

  onDelete(callback) {
    this.deleteListeners.push(callback);
  }

  // ✅ NEW: Add cleanup method
  offDelete(callback) {
    const index = this.deleteListeners.indexOf(callback);
    if (index > -1) {
      this.deleteListeners.splice(index, 1);
    }
  }

  notifyListeners(message) {
    this.messageListeners.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        log.error("Error in message listener:", error);
      }
    });
  }

  notifyClearListeners() {
    this.clearListeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        log.error("Error in clear listener:", error);
      }
    });
  }

  notifyDeleteListeners() {
    this.deleteListeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        log.error("Error in delete listener:", error);
      }
    });
  }
}

export const textChat = new TextChat();
