/**
 * Voice Commands Processor Module
 * Parses transcribed text from the operator and triggers corresponding HUD functions.
 */

import { playBeep, speak } from '../utils/audio.js';
import { setVisionMode, currentDetectCount } from '../vision/index.js';
import { toggleComms } from '../comms/index.js';
import { muteAlarms } from '../sensors/index.js';

export function processVoiceCommand(command) {
    const voicePanel = document.getElementById("voice-cmd-panel");
    const voiceText = document.getElementById("voice-cmd-text");
    
    let executedCmdStr = null;

    // --- 1. NLP: Vision Control ---
    if (command.includes("vision") || command.includes("optics") || command.includes("mode") || command.includes("thermal") || command.includes("lidar") || command.includes("scan")) {
        if (command.includes("night") || command.includes("dark")) {
            setVisionMode('nvg'); 
            speak("Engaging night vision mode."); 
            executedCmdStr = "NVG OPTICS ENGAGED";
        } else if (command.includes("thermal") || command.includes("heat")) {
            setVisionMode('flir'); 
            speak("Engaging thermal tracking."); 
            executedCmdStr = "THERMAL OPTICS ENGAGED";
        } else if (command.includes("lidar") || command.includes("scan")) {
            setVisionMode('lidar'); 
            speak("Initiating topological LiDAR sweep."); 
            executedCmdStr = "LIDAR SCAN ACTIVE";
        } else if (command.includes("normal") || command.includes("optical") || command.includes("standard")) {
            setVisionMode('std'); 
            speak("Returning to standard optical feed."); 
            executedCmdStr = "STANDARD OPTICS ENGAGED";
        }
    }

    // --- 2. NLP: AI Query (How many people?) ---
    if (command.includes("how many") || command.includes("what is") || command.includes("report")) {
        if (command.includes("people") || command.includes("person") || command.includes("human") || command.includes("target")) {
            let cnt = currentDetectCount;
            if (cnt === 0) { 
                speak("I do not detect any personnel on screen."); 
            } else if (cnt === 1) { 
                speak("I am tracking exactly one target."); 
            } else { 
                speak(`I am currently tracking ${cnt} active targets.`); 
            }
            executedCmdStr = "AI QUERY: TARGET COUNT";
        }
    }

    // --- 3. NLP: Audio/Alarm Muting ---
    if (command.includes("mute") || command.includes("shut") || command.includes("stop") || command.includes("quiet") || command.includes("disable")) {
        if (command.includes("warning") || command.includes("alarm") || command.includes("alert")) {
            let minutes = 1; // Default to 1 minute
            
            // Try to parse a specific number of minutes from the command
            let match = command.match(/(\d+)\s*(min|minute)/);
            if(match) minutes = parseInt(match[1]);
            
            muteAlarms(minutes);
            speak(`Acknowledged. Muting atmospheric hazard alarms for ${minutes} minute${minutes > 1 ? 's' : ''}.`);
            executedCmdStr = `ALARM OVERRIDE [${minutes}M]`;
        }
    }

    // --- 4. NLP: Comms Interaction ---
    if (command.includes("comm") || command.includes("radio") || command.includes("communications")) {
        if (command.includes("start") || command.includes("begin") || command.includes("engage") || command.includes("init")) {
            toggleComms(true); 
            speak("Intercepting local radio bands."); 
            executedCmdStr = "COMMS INITIATED";
        } else if (command.includes("stop") || command.includes("halt") || command.includes("cut")) {
            toggleComms(false); 
            speak("Radio intercept halted."); 
            executedCmdStr = "COMMS HALTED";
        }
    }

    // --- Visual Feedback ---
    // If a command was successfully parsed, display it on the HUD temporarily.
    if (executedCmdStr) {
        voicePanel.classList.remove("hidden");
        voicePanel.classList.add("active");
        voiceText.innerText = executedCmdStr;
        
        playBeep(1500, "square", 0.1, 0.05);
        
        // Hide the feedback panel after 3 seconds
        setTimeout(() => {
            voicePanel.classList.remove("active");
            voicePanel.classList.add("hidden");
        }, 3000);
    }
}
