# Measuring RTC Performance – Team Alpha

## 📖 About This Project

This project focuses on understanding the performance of real-time video calls using Google Meet by simulating browser-to-browser sessions between AWS EC2 instances in different global regions. Our goal is to measure Quality of Experience (QoE) using metrics like bitrate, jitter, frame rate, packet loss, and visual quality (e.g., VMAF, SSIM, PSNR).

---

## 🌍 Call Routes Tested

We established test calls between AWS EC2 nodes in these regions:

- San Francisco → Seattle
- Seattle → Fairfax
- San Francisco/Seattle → London
- San Francisco/Seattle → Dubai
- Singapore → London

---

## ✅ What We Did

- Set up EC2 nodes across multiple AWS regions.
- Conducted browser-to-browser Google Meet calls between nodes.
- Collected WebRTC statistics using the `getStats()` API during active sessions.
- Extracted and analyzed video and audio quality metrics from the recordings:
  - VMAF (Video Multi-Method Assessment Fusion)
  - SSIM (Structural Similarity Index)
  - PSNR (Peak Signal-to-Noise Ratio)
- Began correlating packet loss and bitrate variation with perceptual quality issues.

---

## 🚀 How to Run This Project

### Step 1: Launch EC2 Nodes

- Create two AWS EC2 instances in two different regions listed above.
- Make sure each node has:
  - Python 3 installed
  - Google Chrome or Chromium
  - `chromedriver` in the system PATH
  - This project’s scripts (cloned or copied)

### Step 2: Start a Google Meet Call Between Nodes

- Manually or programmatically initiate a call between the two EC2 nodes using a shared Google Meet URL.
- Run `collect_stats.py` on each node to capture WebRTC statistics during the session.

```bash
python collect_stats.py
```

This script:
- Joins the Meet call via headless Chrome
- Collects `getStats()` data in real time
- Saves it to a local file

### Step 3: Extract and Analyze Quality Metrics

Run:

```bash
python analyze_results.py
```

Or open the notebook:

```bash
jupyter notebook vqm.ipynb
```

This step includes:
- Extracting VMAF, SSIM, PSNR from recorded video streams
- Comparing objective metrics against network stats for insights

---

## 📁 Project Files

- `collect_stats.py` – Collects WebRTC stats from a Google Meet call.
- `analyze_results.py` – Parses the collected data.
- `vqm.ipynb` – Visual analysis of call quality.
- `examples/` – Sample results and logs.
- `README.md` – This guide.

---

## 👥 Team Members

- Alice Smith (asmith@gmu.edu)
- Bob Nguyen (bnguyen@gmu.edu)

---

## 🧾 Notes

- All tests used real Google Meet sessions.
- Calls were launched from EC2 instances across different AWS regions.
- This project is part of the **CoMIC XR course at GMU**.

Thanks for checking out our work!
