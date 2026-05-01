/**
 * Speech Recognition Module
 * Initializes the Web Speech API to listen for operator voice commands.
 */

import { processVoiceCommand } from './commands.js';

export function setupRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn("Speech Recognition API not supported in this browser.");
        return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onend = () => {
        try {
            recognition.start();
        } catch (e) {
            // Ignore repeated start attempts while the browser is still settling.
        }
    };
    
    recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const commandText = event.results[last][0].transcript.toLowerCase().trim();
        console.log("NLP Input:", commandText);
        
        // Pass strictly to the JSON intent parser
        processVoiceCommand(commandText);
    };
    
    return recognition;
}
