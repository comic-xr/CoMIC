#!/bin/bash

# === CONFIG ===
BANDWIDTH="1Mbit/s"
DELAY="200ms"
LOSS="0.1"
PIPE_NUM=1
PF_CONF_PATH="$HOME/my_pf.conf"
PROJECT_DIR="$HOME/Downloads/chrome-calling"

# === SETUP NETWORK EMULATION ===
echo "[+] Writing custom pf rule for UDP traffic on port 5201..."
echo "dummynet in quick proto udp from any to any port 5201 pipe $PIPE_NUM" > "$PF_CONF_PATH"

echo "[+] Configuring dummynet pipe with BW=$BANDWIDTH, Delay=$DELAY, PLR=$LOSS..."
sudo dnctl pipe $PIPE_NUM config bw $BANDWIDTH delay $DELAY plr $LOSS

echo "[+] Loading pf rule..."
sudo pfctl -Fa -f "$PF_CONF_PATH"
sudo pfctl -e

# === START WebRTC SERVER ===
echo "[+] Starting WebRTC server (node server.js)..."
cd "$PROJECT_DIR"
node server.js &
SERVER_PID=$!
sleep 3  # allow time to start

# === RUN IPERF TEST ===
echo "[+] Running iPerf3 test to measure degraded network throughput..."
iperf3 -c 192.168.0.21 -u -b 2M -t 10

# === CLEANUP ===
read -p "[?] Do you want to stop the server and revert network settings? (y/n): " confirm
if [[ "$confirm" == "y" ]]; then
    echo "[+] Killing node server..."
    kill $SERVER_PID

    echo "[+] Flushing dummynet and disabling pf..."
    sudo dnctl flush
    sudo pfctl -d

    echo "[✓] Network and server stopped. All clean."
else
    echo "[!] Server is running with emulated network. To revert manually:"
    echo "    kill $SERVER_PID"
    echo "    sudo dnctl flush && sudo pfctl -d"
fi
