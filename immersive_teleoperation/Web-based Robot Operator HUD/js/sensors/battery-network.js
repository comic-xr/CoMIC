/**
 * Battery & Network Sensor Module
 * Monitors system power levels and network latency.
 */

export function initBatteryAndNetwork() {
    // Battery monitoring via the navigator.getBattery API
    if ("getBattery" in navigator) {
        navigator.getBattery().then(b => {
            const updateBattery = () => { 
                const pct = (b.level * 100).toFixed(1);
                document.getElementById("battery").innerText = pct + "%"; 
                
                const bar = document.getElementById("battery-bar");
                bar.style.width = pct + "%";
                
                // Change color based on charge state
                if (b.level <= 0.2) {
                    bar.style.background = "var(--danger)";
                } else if (b.charging) {
                    bar.style.background = "var(--accent)";
                } else {
                    bar.style.background = "var(--success)";
                }
            };
            
            // Set initial state and listen for changes
            updateBattery(); 
            b.addEventListener("levelchange", updateBattery);
        });
    }

    // Network latency monitoring
    if (navigator.connection) {
        const updateNetwork = () => { 
            // Display estimated round-trip time.
            document.getElementById("latency").innerText = (navigator.connection.rtt || 0) + "ms"; 
        };
        
        updateNetwork(); 
        navigator.connection.addEventListener('change', updateNetwork);
    }
}
