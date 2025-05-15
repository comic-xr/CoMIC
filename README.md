# Measuring RTC Performance 
# QOE Evaluation in Real Time Video Communication

## 📖 About This Project

This project focuses on understanding the performance of real-time video calls like using Google Meet by simulating browser-to-browser sessions between AWS EC2 instances in different global regions. Our goal is to measure Quality of Experience (QoE) like visual quality (e.g., VMAF, SSIM, PSNR, vqm etc.. ).

---

## 🌍 Call Routes Tested

We establish test calls between AWS EC2 nodes in these regions:

- San Francisco → Seattle
- Seattle → Fairfax
- San Francisco/Seattle → London
- San Francisco/Seattle → Dubai
- Singapore → London

---

## ✅ What We've Done

- Set up EC2 nodes across multiple AWS regions.
- Conducted browser-to-browser Google Meet calls between nodes.
- Get the call recording
- Uploaded call recordings to the `videos/dist/vp6` `videos/dist/x264`  directory files  for analysis.
- Extracted and analyzed video and audio quality metrics from the recordings:
  - VMAF (Video Multi-Method Assessment Fusion)
  - SSIM (Structural Similarity Index)
  - PSNR (Peak Signal-to-Noise Ratio)
  - Brisque
  - Cambri etc .. 

---

## 🚀 How to Run This Project

### Step 1: Launch EC2 Nodes

- Create two AWS EC2 instances in different regions (based on the call routes listed above).
- Ensure each instance has:
  - Python 3 installed
  - Google Chrome or Chromium
  - `chromedriver` in the system PATH
  - This project’s scripts

### Step 2: Record a Video Call (Manual Step)

- Join a Google Meet call between the two EC2 instances and **record the session manually**.
- Save the recording and **place it into the `videos/dist/vp6` `videos/dist/x264`  folder** within the project directory.
  - File format: MP4 or compatible
  - Naming convention: `{location1}-{location2}-timestamp.mp4`

### Step 3: Extract and Analyze Quality Metrics

Run:



```bash
jupyter notebook vqm.ipynb
```
similarly all the ipynb files
This step will:
- Analyze the uploaded recording for VMAF, SSIM, PSNR, Brisque, Cambri etc ..

---

## 📁 Project Files

- `collect_stats.py` – Optional: collect WebRTC stats from a call.
- `vqm.ipynb` – Notebook for visual analysis.
- `videos/vp6-x264/` – Folder to upload test videos.
- `examples/` – Sample output logs and visualizations.
- `README.md` – This guide.

---

## 👥 Team Members

- Nikhita Shreya Bondela
- Brundha Boora

---

## 🧾 Notes

- All videos analyzed were recorded from actual Google Meet sessions between AWS EC2 nodes.
- This project is part of the **CoMIC XR course at GMU**.

Thanks for checking out our work!
