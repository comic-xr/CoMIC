/**
 * Camera Module
 * Handles initialization of the physical webcam and manages the CSS filters
 * that simulate various tactical vision modes.
 */

import { playBeep } from '../utils/audio.js';

export function initCamera() {
    const video = document.getElementById("webcam");
    const videoStatus = document.getElementById("video-status");
    const statusPulse = document.querySelector('.pulse-ring');
    if (!video) return;
    
    // Request access to the user's camera hardware.
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => { 
                video.srcObject = stream; 
                
                // Ensure video dimensions match the intrinsic stream size
                video.addEventListener('loadedmetadata', () => {
                    video.width = video.videoWidth;
                    video.height = video.videoHeight;
                });
            })
            .catch(error => {
                // Failsafe UI update if camera is denied or unavailable.
                console.warn("Camera hardware unavailable.", error);
                if (videoStatus) {
                    videoStatus.innerText = "CAM ERROR / OFFLINE";
                }
                if (statusPulse) {
                    statusPulse.style.background = 'var(--danger)';
                }
            });
    }

    // Attach event listeners to vision mode UI buttons
    const visionBtns = document.querySelectorAll(".vision-btn");
    visionBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            setVisionMode(btn.dataset.mode);
        });
    });
}

/**
 * Applies a specific CSS filter to the video feed.
 * @param {string} modeStr - The identifier for the mode (e.g., 'std', 'nvg', 'flir', 'lidar').
 */
export function setVisionMode(modeStr) {
    // Acknowledge the mode change audibly.
    playBeep(1200, 'square', 0.05, 0.05);
    
    const video = document.getElementById("webcam");
    if (!video) return;
    
    // Update the active state on the UI buttons.
    document.querySelectorAll(".vision-btn").forEach(b => b.classList.remove("active"));
    const targetBtn = document.querySelector(`.vision-btn[data-mode="${modeStr}"]`);
    if (targetBtn) {
        targetBtn.classList.add("active");
    }
    
    // Apply the CSS class to the video element.
    video.className = `mode-${modeStr}`;
}
