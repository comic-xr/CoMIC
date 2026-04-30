/**
 * Speech Recognition Module
 * Initializes the Web Speech API to listen for operator voice commands.
 */

import { processVoiceCommand } from './commands.js';

export function setupRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // Check for browser support
    if (!SpeechRecognition) {
        console.warn("Speech Recognition API not supported in this browser. Voice commands disabled.");
        return null;
    }

    const recognition = new SpeechRecognition();
    
    // Configure recognition parameters for continuous listening
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // Auto-restart recognition if it terminates unexpectedly
    recognition.onend = () => {
        try { 
            recognition.start(); 
        } catch(e) {
            console.error("Failed to restart speech recognition:", e);
        }
    };
    
    // Handle successful speech interpretation
    recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const commandText = event.results[last][0].transcript.toLowerCase().trim();
        
        console.log("NLP Intercept:", commandText);
        
        // Pass the transcribed text to the command processor
        processVoiceCommand(commandText);
    };
    
    return recognition;
}
