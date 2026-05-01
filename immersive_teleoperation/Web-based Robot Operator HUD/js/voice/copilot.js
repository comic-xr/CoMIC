import { playBeep } from '../utils/audio.js';
import { setVisionMode } from '../vision/index.js';
import { toggleComms } from '../comms/index.js';
import { muteAlarms } from '../sensors/index.js';

export let isCopilotActive = false;
let conversationHistory = [];

export function initCopilotToggle() {
    const btn = document.getElementById('copilot-toggle-btn');
    if (!btn) return;
    
    btn.addEventListener('click', () => {
        isCopilotActive = !isCopilotActive;
        if (isCopilotActive) {
            conversationHistory = []; // Reset context on new session
            btn.innerText = 'CO-PILOT: ON';
            btn.classList.add('active');
            btn.style.boxShadow = '0 0 10px #00ffcc';
        } else {
            btn.innerText = 'CO-PILOT: OFF';
            btn.classList.remove('active');
            btn.style.boxShadow = 'none';
        }
    });
}

function speakNow(text) {
    if (!text || text.trim() === "") return;
    console.log("Co-pilot Speaks:", text);
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1.0; 
    msg.pitch = 0.95;
    window.speechSynthesis.speak(msg);
}

function processAndSpeak(sentence) {
    let stripSentence = sentence;
    let foundTag = false;

    // Check for embedded action tags
    const actionMap = {
        "<CMD:NVG>": () => setVisionMode('nvg'),
        "<CMD:FLIR>": () => setVisionMode('flir'),
        "<CMD:LIDAR>": () => setVisionMode('lidar'),
        "<CMD:STD>": () => setVisionMode('std'),
        "<CMD:MUTE>": () => muteAlarms(1),
        "<CMD:COMM>": () => toggleComms(true)
    };

    for (const [tag, actionFn] of Object.entries(actionMap)) {
        if (stripSentence.includes(tag)) {
            actionFn();
            stripSentence = stripSentence.replace(tag, "");
            foundTag = true;
        }
    }

    if (foundTag) {
        playBeep(1200, "square", 0.1, 0.05);
    }

    if (stripSentence.trim() !== "") {
        speakNow(stripSentence.trim());
    }
}

export async function handleCopilotStream(transcript) {
    const voicePanel = document.getElementById("voice-cmd-panel");
    const voiceText = document.getElementById("voice-cmd-text");
    if (!voicePanel || !voiceText) return;
    
    voicePanel.classList.remove("hidden");
    voicePanel.classList.add("active");
    voiceText.innerText = `[YOU]: ${transcript}\n[AI]: THINKING...`;

    // Append user input to global history
    conversationHistory.push({ role: "user", content: transcript });

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationHistory })
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        
        let currentSentence = "";
        let displayedText = "";
        let fullResponse = "";
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split('\n').filter(l => l.trim() !== '');
            
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    // Ollama native chat returns inner message object
                    const token = parsed.message ? parsed.message.content : (parsed.response || "");
                    
                    if (token) {
                        currentSentence += token;
                        displayedText += token;
                        fullResponse += token;
                        
                        voiceText.innerText = `[YOU]: ${transcript}\n[AI]: ${displayedText}`;
                        
                        if (/[.!?]/.test(token)) {
                            processAndSpeak(currentSentence.trim());
                            currentSentence = ""; 
                        }
                    }
                } catch (e) {
                    // Ignore partial JSON fragments until the next chunk arrives.
                }
            }
        }
        
        if (currentSentence.trim() !== "") {
            processAndSpeak(currentSentence.trim());
        }

        // Store full AI context in history
        conversationHistory.push({ role: "assistant", content: fullResponse });

        setTimeout(() => {
            voicePanel.classList.remove("active");
            voicePanel.classList.add("hidden");
        }, 5000);

    } catch (error) {
        console.error("Co-pilot Stream Error:", error);
        voiceText.innerText += "\nCONNECTION FAILURE";
    }
}
