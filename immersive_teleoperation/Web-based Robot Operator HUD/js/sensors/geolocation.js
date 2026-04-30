/**
 * Geolocation Sensor Module
 * Hooks into the browser's Geolocation API and device orientation events
 * to update the Leaflet tactical map and coordinate telemetry.
 */

export function initGeolocation() {
    // DOM Elements for Coordinates
    const elCoordX = document.getElementById("coord-x");
    const elCoordY = document.getElementById("coord-y");
    
    // Initialize the Leaflet map in the tactical container.
    const tacticalMap = L.map('tactical-map-container', { 
        zoomControl: false, 
        attributionControl: false 
    }).setView([0, 0], 15);
    
    // Load a dark, high-contrast basemap suitable for a tactical HUD.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(tacticalMap);
    
    // The marker representing the robot's current position.
    let robotMarker = L.circleMarker([0, 0], { color: 'var(--accent)', radius: 6 }).addTo(tacticalMap);

    // Watch position continuously if available.
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(
            pos => {
                // Update text telemetry
                elCoordX.innerText = pos.coords.latitude.toFixed(4);
                elCoordY.innerText = pos.coords.longitude.toFixed(4);
                
                let s = pos.coords.speed; 
                document.getElementById("speed").innerText = (s !== null ? s.toFixed(1) : "0.0") + " m/s";
                
                // Update map view and marker
                tacticalMap.setView([pos.coords.latitude, pos.coords.longitude]);
                robotMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
            }, 
            err => {
                console.warn("GPS signal lost or unavailable.");
            }, 
            { enableHighAccuracy: true }
        );
    }
    
    // Track device orientation for Pitch and Yaw telemetry.
    window.addEventListener("deviceorientation", e => {
        if(e.beta !== null) {
            document.getElementById("pitch").innerText = e.beta.toFixed(1) + "°";
        }
        if(e.alpha !== null) {
            document.getElementById("yaw").innerText = e.alpha.toFixed(1) + "°";
        }
    });
}
