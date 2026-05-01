import { interceptHistory } from './nlp-filter.js';

export function initSummarizer() {
    const btn = document.getElementById('summarize-logs-btn');
    const banner = document.getElementById('comms-summary-banner');
    if (!btn || !banner) return;

    btn.addEventListener('click', async () => {
        if (interceptHistory.length === 0) {
            banner.classList.remove('hidden');
            banner.innerText = "LLM SUMMARY: No radio intercepts available to summarize.";
            return;
        }

        banner.classList.remove('hidden');
        banner.innerText = "LLM: GENERATING TACTICAL SUMMARY...";
        
        try {
            const response = await fetch('/api/summarize-comms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: interceptHistory })
            });
            const data = await response.json();
            banner.innerText = "LLM SUMMARY: " + data.summary;
        } catch (e) {
            console.error(e);
            banner.innerText = "LLM ERROR: COULD NOT CONNECT TO OLLAMA.";
        }
    });
}
