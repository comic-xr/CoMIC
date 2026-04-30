/**
 * Main Application Entry Point
 * Bootstraps all subsystems for the Robot HUD.
 */

import { initAudio } from './utils/audio.js';
import { initSensors } from './sensors/index.js';
import { initVision } from './vision/index.js';
import { initComms } from './comms/index.js';
import { initVoiceCmd } from './voice/index.js';

document.addEventListener("DOMContentLoaded", () => {
    // Audio Context requires a user gesture to initialize properly.
    document.body.addEventListener('click', initAudio, { once: true });
    
    // Initialize all HUD subsystems
    initSensors();   // GPS, Battery, Network, Hazmat
    initVision();    // Webcam, TFJS Tracking, Vision Modes
    initComms();     // Radio intercepts, NLP filtering
    initVoiceCmd();  // Speech recognition and commands
});
