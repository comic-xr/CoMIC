/**
 * Voice Commands Processor Module
 * Uses the expressive LLM JSON backend strictly as a silent decoder.
 */

import { playBeep, speak } from '../utils/audio.js';
import { setVisionMode, currentDetectCount } from '../vision/index.js';
import { toggleComms } from '../comms/index.js';
import { muteAlarms } from '../sensors/index.js';

export async function processVoiceCommand(command) {
    const voicePanel = document.getElementById("voice-cmd-panel");
    const voiceText = document.getElementById("voice-cmd-text");
    if (!voicePanel || !voiceText) return;
    
    let executedCmdStr = null;

    try {
        console.log("Sending unstructured voice to AI decoder:", command);
        const response = await fetch('/api/voice-command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: command })
        });
        
        const data = await response.json();
        console.log("JSON Intent Decoded:", data);

        const action = data.action;
        const param = data.param;

        // SILENT EXECUTIONS. NO TALK BACK UNLESS CONTEXTUALLY REQUIRED (like QUERY_TARGETS).
        switch (action) {
            case "VISION_MODE":
                if (param === 'nvg') {
                    setVisionMode('nvg'); executedCmdStr = "NVG OPTICS ENGAGED";
                } else if (param === 'flir') {
                    setVisionMode('flir'); executedCmdStr = "THERMAL OPTICS ENGAGED";
                } else if (param === 'lidar') {
                    setVisionMode('lidar'); executedCmdStr = "LIDAR SCAN ACTIVE";
                } else if (param === 'std') {
                    setVisionMode('std'); executedCmdStr = "STANDARD OPTICS ENGAGED";
                }
                break;
            case "QUERY_TARGETS":
                // the ONLY time it speaks back is if it's retrieving intel for the user.
                const cnt = currentDetectCount;
                if (cnt === 0) speak("0 personnel detected.");
                else if (cnt === 1) speak("Tracking one target.");
                else speak(`Tracking ${cnt} targets.`);
                executedCmdStr = "AI QUERY: TARGET COUNT";
                break;
            case "MUTE_ALARM":
                const minutes = Number.parseInt(param, 10) || 5; // default 5 mins
                muteAlarms(minutes);
                executedCmdStr = `ALARM OVERRIDE [${minutes}M]`;
                break;
            case "TOGGLE_COMMS":
                toggleComms(param);
                if (param) { executedCmdStr = "COMMS INITIATED"; }
                else { executedCmdStr = "COMMS HALTED"; }
                break;
            default:
                console.log("LLM decoded invalid or UNKNOWN action.");
                break;
        }

    } catch (e) {
        console.error("Error connecting to AI decoder:", e);
    }

    // --- Minimal Visual Feedback ---
    if (executedCmdStr) {
        voicePanel.classList.remove("hidden");
        voicePanel.classList.add("active");
        voiceText.innerText = executedCmdStr;
        
        playBeep(1500, "square", 0.1, 0.05);
        
        setTimeout(() => {
            voicePanel.classList.remove("active");
            voicePanel.classList.add("hidden");
        }, 1500);
    }
}
