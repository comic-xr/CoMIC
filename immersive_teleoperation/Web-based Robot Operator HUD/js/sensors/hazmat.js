/**
 * Hazmat Sensor Module
 * Simulates readings for O2 and CO2 levels in the immediate environment.
 * Triggers UI alerts and audio alarms if conditions become hazardous.
 */

import { playBeep } from '../utils/audio.js';

export let isMutedUntil = 0;

export function initHazmat() {
    const elO2 = document.getElementById("o2-level");
    const elCO2 = document.getElementById("co2-level");
    const elO2Bar = document.getElementById("o2-bar");
    const elCO2Bar = document.getElementById("co2-bar");
    
    const alertBox = document.getElementById("critical-alert");
    const alertDesc = document.getElementById("alert-desc");
    
    // Initial baseline readings
    let currentO2 = 21.0; 
    let currentCO2 = 400; 

    // Simulation loop to generate fluctuating sensor data
    function updateHazmatSys() {
        // Normal drift
        currentO2 += (Math.random() * 0.1 - 0.05);
        currentCO2 += (Math.random() * 20 - 10);
        
        // Random hazard spikes (2% chance per tick)
        if (Math.random() < 0.02) { 
            currentO2 -= 2.5; 
            currentCO2 += 2500; 
        }
        
        // Natural recovery if things get bad
        if (currentO2 < 19.5 && Math.random() > 0.4) currentO2 += 0.5;
        if (currentCO2 > 1000 && Math.random() > 0.4) currentCO2 -= 300;

        // Clamp values to realistic limits
        currentO2 = Math.max(16.0, Math.min(23.0, currentO2));
        currentCO2 = Math.max(300, Math.min(9999, currentCO2));

        // Update Text
        elO2.innerText = currentO2.toFixed(1) + "%";
        elCO2.innerText = Math.round(currentCO2) + " ppm";
        
        // Update Progress Bars
        elO2Bar.style.width = Math.min(100, (currentO2 / 23.0) * 100) + "%";
        elCO2Bar.style.width = Math.min(100, (currentCO2 / 10000) * 100) + "%";

        // Determine hazard state
        let isO2Danger = currentO2 < 19.5; 
        let isCO2Danger = currentCO2 > 5000;
        let isO2Warning = !isO2Danger && currentO2 <= 20.0;
        let isCO2Warning = !isCO2Danger && currentCO2 > 1000;
        
        // Apply CSS classes based on state
        elO2.className = `val-text ${isO2Danger ? "danger" : (isO2Warning ? "warning" : "safe")}`;
        elCO2.className = `val-text ${isCO2Danger ? "danger" : (isCO2Warning ? "warning" : "safe")}`;
        elO2Bar.className = `progress-fill ${isO2Danger ? "danger-fill" : (isO2Warning ? "warning-fill" : "safe-fill")}`;
        elCO2Bar.className = `progress-fill ${isCO2Danger ? "danger-fill" : (isO2Warning ? "warning-fill" : "safe-fill")}`;

        // Handle critical alerts banner
        if (isO2Danger || isCO2Danger) {
            let msg = [];
            if (isO2Danger) msg.push(`O2 DEPLETION: ${currentO2.toFixed(1)}%`);
            if (isCO2Danger) msg.push(`CO2 TOXICITY: ${Math.round(currentCO2)}ppm`);
            
            alertDesc.innerText = msg.join(" // ");
            alertBox.classList.remove("hidden");
            
            // Play alarm beep unless the operator muted it via voice command
            if (Date.now() > isMutedUntil) {
                playBeep(400, 'sawtooth', 0.2, 0.1); 
            }
        } else {
            alertBox.classList.add("hidden");
        }
    }
    
    // Run the simulation tick every second
    setInterval(updateHazmatSys, 1000);
}

/**
 * Temporarily silences the hazard alarms.
 * @param {number} minutes - Number of minutes to mute the alarm.
 */
export function muteAlarms(minutes) {
    isMutedUntil = Date.now() + (minutes * 60000);
}
