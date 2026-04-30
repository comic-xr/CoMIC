/**
 * Audio Utility Module
 * Manages the Web Audio API context for generating synthesized beeps
 * and the Web Speech API for text-to-speech output.
 */

// Keep a persistent reference to the audio context to prevent clipping/lag.
let audioCtx = null;
const synth = window.speechSynthesis;

/**
 * Initializes the AudioContext. Browsers require a user gesture (like a click)
 * before audio can play, so this should be triggered by the first interaction.
 */
export function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if it was suspended by the browser.
    if(audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

/**
 * Generates a synthesized beep sound.
 * @param {number} freq - Frequency of the oscillator (pitch).
 * @param {string} type - Oscillator type ('sine', 'square', 'sawtooth', 'triangle').
 * @param {number} duration - Duration of the beep in seconds.
 * @param {number} vol - Volume (gain) between 0 and 1.
 */
export function playBeep(freq, type, duration, vol) {
    if (!audioCtx) return;
    
    // Ensure context is awake.
    if(audioCtx.state === 'suspended') audioCtx.resume();
    
    // Create an oscillator and a gain node to control the volume.
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    // Start loud and fade out sharply.
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    // Connect up the signal path.
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

/**
 * Synthesizes speech from text using the system's TTS engine.
 * @param {string} text - The text for the robot to vocalize.
 */
export function speak(text) {
    if (!synth) return;
    
    // Interrupt any currently playing speech to prioritize this message.
    synth.cancel(); 
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.8; // Deep, robotic tone
    utterance.rate = 1.1;  // Slightly faster than normal
    utterance.volume = 0.8;
    
    synth.speak(utterance);
}
