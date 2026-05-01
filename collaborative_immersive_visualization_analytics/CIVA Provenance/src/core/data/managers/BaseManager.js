import { createLogger } from "@Utils/logger.js";

/**
 * BaseManager - Abstract base class for all managers
 * Provides standardized event handling
 */
export class BaseManager {
  constructor(options = {}) {
    const {
      events = [],
      logCategory = "manager",
      validateEvents = false,
    } = options;

    this._listeners = new Map();
    this._validEvents = new Set(events);
    this._validateEvents = validateEvents;
    this._log = createLogger(logCategory);
    this._disposed = false;

    for (const event of events) {
      this._listeners.set(event, []);
    }
  }

  on(event, callback) {
    if (this._disposed) {
      this._log.warn(`Cannot subscribe to '${event}' - manager is disposed`);
      return () => {};
    }
    if (typeof callback !== "function") {
      this._log.error(`Callback for '${event}' must be a function`);
      return () => {};
    }
    if (
      this._validateEvents &&
      this._validEvents.size > 0 &&
      !this._validEvents.has(event)
    ) {
      this._log.warn(`Unknown event: '${event}'`);
    }
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    return this.on(event, wrapper);
  }

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (!listeners) return;
    const index = listeners.indexOf(callback);
    if (index !== -1) listeners.splice(index, 1);
  }

  removeAllListeners(event) {
    if (event) {
      this._listeners.set(event, []);
    } else {
      for (const key of this._listeners.keys()) {
        this._listeners.set(key, []);
      }
    }
  }

  _emit(event, data) {
    if (this._disposed) return;
    const listeners = this._listeners.get(event);
    if (!listeners || listeners.length === 0) return;
    const listenersCopy = [...listeners];
    for (const callback of listenersCopy) {
      try {
        callback(data);
      } catch (error) {
        this._log.error(`Error in '${event}' event handler:`, error);
      }
    }
  }

  listenerCount(event) {
    const listeners = this._listeners.get(event);
    return listeners ? listeners.length : 0;
  }

  eventNames() {
    return [...this._listeners.entries()]
      .filter(([, listeners]) => listeners.length > 0)
      .map(([event]) => event);
  }

  get isDisposed() {
    return this._disposed;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.removeAllListeners();
    this._listeners.clear();
    this._log.debug("Manager disposed");
  }
}

export default BaseManager;
