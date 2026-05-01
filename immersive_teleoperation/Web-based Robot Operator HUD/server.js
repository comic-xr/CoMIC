const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8080;
const OLLAMA_URL = 'http://127.0.0.1:11434';
const OLLAMA_MODEL = 'tinyllama';

app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

async function callOllama(endpoint, payload) {
    const response = await fetch(`${OLLAMA_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            ...payload
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama request failed (${response.status}): ${errorText}`);
    }

    return response;
}

// New LLM Integration Endpoint
app.post('/api/voice-command', async (req, res) => {
    try {
        const { transcript } = req.body;
        if (!transcript) {
            return res.status(400).json({ error: "No transcript provided" });
        }

        const systemPrompt = `You are a strict JSON intent decoder.
Provide ONLY a flat JSON object based on the transcript. Do NOT output anything else.

Rules:
- Night vision/dark -> {"action": "VISION_MODE", "param": "nvg"}
- Thermal/heat -> {"action": "VISION_MODE", "param": "flir"}
- Lidar/scan -> {"action": "VISION_MODE", "param": "lidar"}
- Normal/standard -> {"action": "VISION_MODE", "param": "std"}
- Quiet/Do not disturb/stop warning -> {"action": "MUTE_ALARM", "param": 5}
- Start comms -> {"action": "TOGGLE_COMMS", "param": true}
- Stop comms -> {"action": "TOGGLE_COMMS", "param": false}
- Query targets/people -> {"action": "QUERY_TARGETS", "param": null}

Transcript: "${transcript}"`;

        const ollamaResponse = await callOllama('/api/generate', {
            prompt: systemPrompt,
            format: 'json',
            stream: false
        });

        const data = await ollamaResponse.json();
        
        let parsedCommand = { action: "UNKNOWN", param: null };
        try {
            parsedCommand = JSON.parse(data.response.trim());
        } catch (e) {
            console.error("Failed to parse LLM response:", data.response);
        }

        res.json(parsedCommand);

    } catch (error) {
        console.error("Backend LLM connection error:", error);
        res.status(500).json({ error: "Failed to process voice command via LLM" });
    }
});

// New Comms Summarizer Endpoint
app.post('/api/summarize-comms', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !messages.length) {
            return res.status(400).json({ summary: "No intercept history available to summarize." });
        }

        const systemPrompt = `Summarize the following radio intercepts in exactly one short sentence. No intros, no markdown, no conversational text.

Intercepts:
${messages.join("\n")}

Your entire output must be exactly one single sentence.`;

        const ollamaResponse = await callOllama('/api/generate', {
            prompt: systemPrompt,
            stream: false
        });

        const data = await ollamaResponse.json();
        res.json({ summary: data.response.trim() });

    } catch (error) {
        console.error("Backend LLM connection error:", error);
        res.status(500).json({ error: "Failed to summarize comms via LLM" });
    }
});

// New Conversational Co-pilot Endpoint (Streaming)
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) { return res.status(400).json({ error: "No messages array provided" }); }

        const systemMessage = {
            role: "system",
            content: `You are the AI co-pilot of a tactical Robot Operator HUD. 
If the operator asks you to perform an action (e.g., switch vision, mute alarms), you MUST output ONLY the appropriate tag and NO OTHER TEXT. Do not talk back or confirm.
<CMD:NVG> (Night vision)
<CMD:FLIR> (Thermal/Heat)
<CMD:LIDAR> (LiDAR tracking)
<CMD:STD> (Standard optics)
<CMD:MUTE> (Mute alarms)
<CMD:COMM> (Toggle communications)

Only answer with conversation if the user explicitly asks a question or chats.`
        };

        const ollamaResponse = await callOllama('/api/chat', {
            messages: [systemMessage, ...messages],
            stream: true
        });

        res.writeHead(200, { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' });
        if (!ollamaResponse.body) {
            throw new Error('Ollama response body is empty.');
        }

        const reader = ollamaResponse.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
        }
        res.end();

    } catch (error) {
        console.error('Streaming error:', error);
        res.status(500).json({ error: 'LLM connection error' });
    }
});

// Fallback for HTML
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`RobotHUD backend running at http://127.0.0.1:${PORT}`);
    console.log('Local LLM integration active on POST /api/voice-command');
});
