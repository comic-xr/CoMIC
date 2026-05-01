/**
 * Battery & Network Sensor Module
 * Monitors system power levels and network latency.
 */

export function initBatteryAndNetwork() {
    const batteryText = document.getElementById("battery");
    const batteryBar = document.getElementById("battery-bar");
    const latencyText = document.getElementById("latency");

    // Battery monitoring via the navigator.getBattery API
    if (batteryText && batteryBar && "getBattery" in navigator) {
        navigator.getBattery().then(b => {
            const updateBattery = () => { 
                const pct = (b.level * 100).toFixed(1);
                batteryText.innerText = pct + "%";
                batteryBar.style.width = pct + "%";
                
                // Change color based on charge state
                if (b.level <= 0.2) {
                    batteryBar.style.background = "var(--danger)";
                } else if (b.charging) {
                    batteryBar.style.background = "var(--accent)";
                } else {
                    batteryBar.style.background = "var(--success)";
                }
            };
            
            // Set initial state and listen for changes
            updateBattery(); 
            b.addEventListener("levelchange", updateBattery);
        });
    }

    // Network latency monitoring
    if (latencyText && navigator.connection) {
        const updateNetwork = () => { 
            // Display estimated round-trip time.
            latencyText.innerText = (navigator.connection.rtt || 0) + "ms";
        };
        
        updateNetwork(); 
        navigator.connection.addEventListener('change', updateNetwork);
    }
}
