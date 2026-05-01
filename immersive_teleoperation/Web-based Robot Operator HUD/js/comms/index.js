/**
 * Communications Root Module
 * Manages the timing loop and overall state of the simulated radio interception system.
 */

import { playBeep } from '../utils/audio.js';
import { processRadioMessage } from './nlp-filter.js';
import { MOCK_TRANSMISSIONS } from '../data/mock-transmissions.js';
import { initSummarizer } from './summarizer.js';

export let isListeningComms = false;
let radioInterval = null;

export function initComms() {
    const btnToggleListen = document.getElementById("toggle-listen-btn");
    if (!btnToggleListen) return;

    btnToggleListen.addEventListener("click", () => toggleComms());
    initSummarizer();
}

/**
 * Toggles the radio interception system on or off.
 * @param {boolean|null} forceState - Optional flag to force a specific state.
 */
export function toggleComms(forceState = null) {
    const btnToggleListen = document.getElementById("toggle-listen-btn");
    const statusNlp = document.getElementById("nlp-status");
    const radioFeedContainer = document.getElementById("radio-feed-container");
    if (!btnToggleListen || !statusNlp || !radioFeedContainer) return;

    if (forceState !== null) {
        if (forceState === isListeningComms) return;
        isListeningComms = forceState;
    } else {
        isListeningComms = !isListeningComms;
    }

    // Feedback click
    playBeep(1000, 'square', 0.1, 0.05);

    if (isListeningComms) {
        // System ON
        btnToggleListen.innerText = "HALT COMM";
        btnToggleListen.classList.add("active");

        statusNlp.innerText = "ACTIVE";
        statusNlp.className = "status-badge active";

        if (radioFeedContainer.innerHTML.includes("AWAITING TRANSMISSION")) {
            radioFeedContainer.innerHTML = "";
        }

        // Start polling for mock transmissions
        radioInterval = setInterval(simulateIncomingRadio, 3000);
        simulateIncomingRadio(true);
    } else {
        // System OFF
        btnToggleListen.innerText = "INIT COMM";
        btnToggleListen.classList.remove("active");

        statusNlp.innerText = "STANDBY";
        statusNlp.className = "status-badge idle";

        clearInterval(radioInterval);
        radioInterval = null;
    }
}

/**
 * Randomly pulls a mock transmission and pushes it to the NLP filter.
 * @param {boolean} force - Bypasses the random probability check.
 */
function simulateIncomingRadio(force = false) {
    if (!isListeningComms) return;
    
    // Only 60% chance of a message per interval
    if (force || Math.random() < 0.6) {
        if (MOCK_TRANSMISSIONS && MOCK_TRANSMISSIONS.length > 0) {
            const randomMsg = MOCK_TRANSMISSIONS[Math.floor(Math.random() * MOCK_TRANSMISSIONS.length)];
            processRadioMessage(randomMsg);
        }
    }
}
