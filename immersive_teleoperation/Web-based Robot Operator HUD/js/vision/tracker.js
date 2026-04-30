/**
 * AI Tracker Module
 * Uses TensorFlow.js and the COCO-SSD pre-trained model to detect humans
 * in the live video stream and draw bounding boxes around them.
 */

import { playBeep } from '../utils/audio.js';

// Export current detect count so voice assistant can query it.
export let currentDetectCount = 0;

export function initTracker() {
    const trackingLayer = document.getElementById("live-tracking-layer");
    const video = document.getElementById("webcam");
    
    let aiModel = null;
    
    // Ensure the external TFJS libraries are loaded before attempting to use them.
    if (typeof cocoSsd !== 'undefined') {
        cocoSsd.load().then(loadedModel => {
            aiModel = loadedModel;
            console.log("TensorFlow COCO-SSD Model Loaded!");
            
            // Delay tracking slightly to ensure video is fully streaming
            setTimeout(detectFrame, 1500); 
        });
    }

    /**
     * Recursive function that runs per-frame to analyze the video feed.
     */
    function detectFrame() {
        if (!aiModel || video.videoWidth === 0) {
            requestAnimationFrame(detectFrame);
            return;
        }
        
        aiModel.detect(video).then(predictions => {
            renderPredictions(predictions, video, trackingLayer);
            requestAnimationFrame(detectFrame);
        }).catch(err => { 
            console.error("Tracking Error:", err);
            requestAnimationFrame(detectFrame); 
        });
    }
}

/**
 * Maps the AI prediction bounding boxes to the DOM.
 * Calculates scaling factors to account for CSS object-fit: cover on the video.
 */
function renderPredictions(predictions, video, trackingLayer) {
    // Clear previous frame's bounding boxes
    trackingLayer.innerHTML = ""; 
    
    // We only care about personnel for this HUD.
    const humans = predictions.filter(p => p.class === "person" && p.score > 0.5);
    currentDetectCount = humans.length;

    // Random targeting beep if humans are in view (adds to the tactical feel)
    if (humans.length > 0 && Math.random() > 0.95) {
        playBeep(2000, 'sine', 0.05, 0.02);
    }

    humans.forEach(human => {
        const vidRatio = video.videoWidth / video.videoHeight;
        const containerRatio = window.innerWidth / window.innerHeight;
        
        let scaleX, scaleY, offsetX = 0, offsetY = 0;
        
        // Calculate offsets to match object-fit: cover
        if (containerRatio > vidRatio) {
            scaleX = window.innerWidth / video.videoWidth;
            scaleY = scaleX;
            offsetY = (window.innerHeight - video.videoHeight * scaleY) / 2;
        } else {
            scaleY = window.innerHeight / video.videoHeight;
            scaleX = scaleY;
            offsetX = (window.innerWidth - video.videoWidth * scaleX) / 2;
        }

        const [x, y, width, height] = human.bbox;
        
        // Build the physical DOM box.
        const box = document.createElement("div");
        box.className = "real-target-box";
        box.style.left = `${x * scaleX + offsetX}px`;
        box.style.top = `${y * scaleY + offsetY}px`;
        box.style.width = `${width * scaleX}px`;
        box.style.height = `${height * scaleY}px`;

        // Attach confidence score label.
        const label = document.createElement("div");
        label.className = "real-target-label";
        label.innerText = `PERSONNEL [${(human.score * 100).toFixed(1)}%]`;
        
        box.appendChild(label);
        trackingLayer.appendChild(box);
    });
}
