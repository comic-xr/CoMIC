/**
 * Sensors Root Module
 * Aggregates all sensor initializations into a single callable function.
 */

import { initGeolocation } from './geolocation.js';
import { initBatteryAndNetwork } from './battery-network.js';
import { initHazmat } from './hazmat.js';

export function initSensors() {
    initGeolocation();
    initBatteryAndNetwork();
    initHazmat();
}

// Re-export specific methods needed elsewhere
export { muteAlarms } from './hazmat.js';
