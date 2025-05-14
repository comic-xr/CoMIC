# 📡 WebRTC Performance Evaluation with Network Emulation

## 📁 Project Overview

This project explores **real-time communication (RTC)** performance under both **normal** and **emulated network conditions**. It includes two main components:

- **Automated WebRTC video streaming** using Chrome and Google Meet.
- **Network condition emulation** using `tc`, `pf`, and `dummynet` to introduce bandwidth limits, delay, and packet loss.

---

## 🔧 Components

### 1. `chrome-calling/`

A minimal WebRTC test harness with:

- `sender.js`, `receiver.js`, and `webrtc-controller.js`: Establishes peer-to-peer connections using STUN.
- `index.html`: Simple HTML page loading webcam and mic streams.
- `script.sh`: Starts server and client sessions; includes iperf3 throughput testing.

### 2. WebRTC Network Emulation

- **Emulation Tools**: `tc` (Linux), `pf + dummynet` (macOS).
- **Test Scenarios**:
  - Normal (10 Mbps, 0 ms delay, 0% loss)
  - Emulated (1 Mbps, 200 ms delay, 10% packet loss)

### 3. WhatsApp Call Automation

- Uses **ADB scripts** to automate video call workflows between two Android devices for real-world application testing.

---

## 📈 Experiments & Results

| **Metric**       | **Chrome WebRTC (Normal)** | **Chrome WebRTC (Emulated)** | **GMeet (Normal)** | **GMeet (Emulated)** |
|------------------|----------------------------|-------------------------------|---------------------|------------------------|
| Bitrate          | ~1.73 Mbps                 | ~767.99 Kbps                  | ~1.73 Mbps          | ~767.99 Kbps           |
| Jitter           | ~0.0012 ms                 | ~2.47 ms                      | ~0.0012 ms          | ~2.47 ms               |
| Packet Loss      | 0%                         | 8.6% (iPerf) / N/A (RTC)      | 0%                  | N/A                    |

- **Observation**: GMeet and Chrome both adapt to constrained networks by reducing bitrate and smoothing jitter.
- **WebRTC Internals Dumps** were used to extract timestamped playout metrics.
- **iPerf3** was used as a baseline to validate raw link performance.

---

## 🛠️ How to Run

### 🔹 Chrome WebRTC Call (Simulated):

```bash
cd chrome-calling
bash script.sh
```

### 🔹 Google Meet Test (Manual):

1. Run the `gmeet_emulation.sh` script to apply emulated conditions.
2. Start a Google Meet call manually in your browser.
3. Observe performance via chrome://webrtc-internals.

---

## 📄 Final Report

See [`Final_report.docx`](./Final_report.docx) for full results, graphs, and explanations of each test scenario.

---

## 📌 Notes

- Tested across Linux (server) and macOS (client).
- WebRTC dumps were parsed manually and programmatically to extract throughput metrics.
- Emulation scripts compatible with both `tc` and `pfctl/dnctl`.

