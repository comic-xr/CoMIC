# WebRTC vs TCP: Network Behavior in Video Streaming

This project compares video streaming performance using **WebRTC** and **TCP** between globally distributed Linux droplets. It captures metrics like **bandwidth**, **RTT**, **packet loss**, and **frame rate** to assess protocol behavior under realistic conditions.

---

## 🌐 Droplet Creation (DigitalOcean)

To set up the testbed:

1. **Create two Ubuntu droplets**:
   - OS: **Ubuntu 24.10 x64**
   - Region: Choose two regions (e.g., NYC and SFO or India)
   - Size: A basic droplet is sufficient

2. **Note the public IP addresses** of both sender and receiver

3. Allow inbound traffic on **port 4000** (signaling) and **12345** (TCP streaming) if using a firewall

4. SSH into both machines to install dependencies and clone the project

---

## 🗂 Project Structure

```
webrtc-performance-test/
├── sender.js                 # WebRTC sender (headless, automated)
├── receiver.js              # WebRTC receiver (headless, metric logger)
├── webrtc-controller.js     # Socket.IO signaling server
├── public/videos/           # Test video files
├── results/                 # Folder to store logs (WebRTC & TCP)
├── stop.sh                  # Cleanup script to stop all test components
├── socket-monitoring.sh     # Logs active TCP socket stats over time
├── script.sh                # Automates emulation, setup, and logging
```

---

## ⚙️ WebRTC Test Setup (Ubuntu 24.10 x64)

### ✅ Step 1: Install Dependencies

Run on both sender and receiver:
```bash
sudo apt update && sudo apt install -y nodejs npm ffmpeg git google-chrome-stable
```

### ✅ Step 2: Clone Repository
```bash
git clone https://github.com//webrtc-performance-test.git
cd webrtc-performance-test
npm install
```

### ✅ Step 3: Generate Test Video
```bash
mkdir -p public/videos
ffmpeg -f lavfi -i testsrc=duration=30:size=1920x1080:rate=30 -pix_fmt yuv420p public/videos/test-video-1080p.mp4
```

---

## 🚀 WebRTC Experiment Instructions

> **Startup Order:**
> 1. Start `webrtc-controller.js` on the **receiver**
> 2. Start `receiver.js` on the **receiver**
> 3. Start `sender.js` on the **sender**

### ▶️ Step 1: Start Signaling Server (Receiver)
```bash
node webrtc-controller.js
```

### ▶️ Step 2: Start Receiver
```bash
node receiver.js \
--server http://<RECEIVER_PUBLIC_IP>:4000 \
--duration 30 \
--output-file results/webrtc/receiver-stats.json \
--id webrtc-receiver \
--headless true
```

### ▶️ Step 3: Start Sender
```bash
node sender.js \
--server http://<RECEIVER_PUBLIC_IP>:4000 \
--video public/videos/test-video-1080p.mp4 \
--duration 30 \
--stats-file results/webrtc/sender-stats.json \
--id webrtc-sender \
--headless true
```

---

## 🧪 TCP Video Streaming Test Setup

### ✅ Install Tools on Both Droplets
```bash
sudo apt update && sudo apt install -y ffmpeg iperf3 tshark xvfb tmux
```

---

## 📄 File Paths

| Component | File or Script | Purpose |
|----------|----------------|---------|
| Sender   | `/root/sender_iperf_stream.sh` | Streams test video and runs iperf3 |
| Receiver | `/root/start_tshark_and_stream.sh` | Logs RTT and listens for TCP video |
| Logs     | `/root/webrtc-performance-test/results/tcp/` | RTT + Throughput logs |

---

## 🚀 Run TCP Test

### ▶️ On Receiver
```bash
iperf3 -s
/root/start_tshark_and_stream.sh
```

### ▶️ On Sender
```bash
/root/sender_iperf_stream.sh
```

---

## 📤 Log Collection

```bash
scp root@<receiverip>:/root/webrtc-performance-test/results/tcp/tcp_rtt_log.csv "/Users/nk/Desktop/NYC RECEIVER/TCP TSHARK/"
scp root@<senderip>:/root/webrtc-performance-test/results/tcp/iperf3-log.txt "/Users/nk/Desktop/NYC RECEIVER/TCP TSHARK/"
```

---

## 🖱️Enable Mouse Support in `tmux`

If you're using `tmux` to manage parallel test panes and want to click, scroll, or switch panes with your mouse:

```bash
nano ~/.tmux.conf
```

Add this line:
```bash
set -g mouse on
```

Then reload the config:
```bash
tmux source-file ~/.tmux.conf
```

---

## 📊 Output Metrics

| Test     | Metrics Captured |
|----------|------------------|
| WebRTC   | FPS, RTT, Bandwidth, Packet Loss (JSON logs) |
| TCP      | RTT (via `tshark`), Throughput (via `iperf3`) |

All logs are saved under `results/` and can be visualized using plotting scripts.

---

## 🧼 Cleanup

Use:
```bash
./stop.sh full
```
to kill any lingering processes like `sender.js`, `receiver.js`, `iperf3`, etc.

---

## 📘 Notes

- Chrome is run via Puppeteer — no GUI or webcam/mic is needed
- Ensure public IP access and open port `4000` on receiver
- Network emulation support via `script.sh` and `tc`/`ifb` automation
- Fully headless and tmux-compatible for SSH-based experiments
