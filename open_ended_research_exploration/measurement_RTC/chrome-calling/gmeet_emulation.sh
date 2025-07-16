#!/bin/bash

# === CONFIG ===
BANDWIDTH="1Mbit/s"
DELAY="200ms"
LOSS="0.1"
PIPE_NUM=1
PF_CONF_PATH="$HOME/gmeet_pf.conf"

# === SETUP NETWORK EMULATION ===
echo "[+] Writing custom pf rule to simulate poor network for WebRTC 
(Google Meet)..."
echo "dummynet in quick proto udp from any to any port 10000:65535 pipe 
$PIPE_NUM" > "$PF_CONF_PATH"
echo "dummynet out quick proto udp from any to any port 10000:65535 pipe 
$PIPE_NUM" >> "$PF_CONF_PATH"

echo "[+] Configuring dummynet pipe with BW=$BANDWIDTH, Delay=$DELAY, 
PLR=$LOSS..."
sudo dnctl pipe $PIPE_NUM config bw $BANDWIDTH delay $DELAY plr $LOSS

echo "[+] Loading pf rules..."
sudo pfctl -Fa -f "$PF_CONF_PATH"
sudo pfctl -e

# === USER ACTION ===
echo "[✓] Network emulation active."
echo "👉 Now start a Google Meet call in your browser and observe the 
network quality."

# === CLEANUP ===
read -p "[?] Press Enter when you're done to revert network settings..."

echo "[+] Reverting settings..."
sudo dnctl flush
sudo pfctl -d
echo "[✓] Network emulation stopped."

