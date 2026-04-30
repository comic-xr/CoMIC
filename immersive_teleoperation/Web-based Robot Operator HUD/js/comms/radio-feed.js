/**
 * Radio Feed UI Module
 * Handles inserting simulated radio messages into the DOM.
 */

/**
 * Injects a new intercepted transmission into the UI.
 * Restricts the log to 2 messages to keep the HUD clean.
 * 
 * @param {string} msg - The raw text of the message.
 * @param {string[]} tags - The critical keywords found in the message.
 */
export function addRadioLog(msg, tags) {
    const radioFeedContainer = document.getElementById("radio-feed-container");
    
    // Create new message wrapper
    const div = document.createElement("div");
    div.className = "radio-msg critical-msg";
    
    // Format detected tags
    let tagsHtml = `<div class="tag-line">[TAGS: ${tags.join(", ").toUpperCase()}]</div>`;
    
    div.innerHTML = `${tagsHtml}<div>${msg}</div>`;
    radioFeedContainer.appendChild(div);
    
    // Prevent the box from overflowing by removing the oldest message
    if (radioFeedContainer.children.length > 2) {
        radioFeedContainer.removeChild(radioFeedContainer.firstChild);
    }
}
