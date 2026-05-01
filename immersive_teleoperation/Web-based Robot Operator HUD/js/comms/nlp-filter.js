/**
 * NLP Filter Module
 * Processes intercepted text strings and scans them for critical keywords
 * to determine if they should be flagged on the HUD.
 */

import { playBeep } from '../utils/audio.js';
import { addRadioLog } from './radio-feed.js';
import { isListeningComms } from './index.js';

export const interceptHistory = [];
const MAX_HISTORY = 10;

// Pre-defined set of tactical keywords that trigger a UI alert.
const CRITICAL_KEYWORDS = [
    "fire", "casualty", "evac", "evacuation", "o2", 
    "emergency", "structural", "spill", "backup", 
    "survivor", "hazmat"
];

/**
 * Simulates an NLP processing delay before outputting the log.
 * @param {string} text - The raw text of the transmission.
 */
export function processRadioMessage(text) {
    const statusNlp = document.getElementById("nlp-status");
    if (!statusNlp) return;
    
    // Show a processing state
    statusNlp.innerText = "PROCESSING";
    statusNlp.className = "status-badge processing";
    
    // Fake a 1.2s delay for "processing" the language
    setTimeout(() => {
        interceptHistory.push(text);
        if (interceptHistory.length > MAX_HISTORY) interceptHistory.shift();

        const lowerText = text.toLowerCase();
        const isCritical = CRITICAL_KEYWORDS.some(kw => lowerText.includes(kw));
        
        if (isCritical) {
            const foundKeywords = CRITICAL_KEYWORDS.filter(kw => lowerText.includes(kw));
            
            // Output to UI
            addRadioLog(text, foundKeywords);
            
            // Audible ping for new critical intel
            playBeep(600, 'square', 0.2, 0.05);
        }
        
        // Return to active state if still listening
        if (isListeningComms) {
            statusNlp.innerText = "ACTIVE";
            statusNlp.className = "status-badge active";
        }
    }, 1200);
}
