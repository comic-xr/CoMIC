/**
 * Voice Control Root Module
 * Sets up speech recognition and handles the initial browser interaction requirements.
 */

import { setupRecognition } from './recognition.js';

export function initVoiceCmd() {
    const recognition = setupRecognition();
    if (!recognition) return;

    // Browsers block microphone access and audio playback without user interaction.
    // We attach a one-time click listener to the body to start the engine.
    document.body.addEventListener('click', () => { 
        setTimeout(() => recognition.start(), 500); 
    }, { once: true });
}
