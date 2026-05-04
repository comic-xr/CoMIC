# Network Traffic Fingerprinting: Classifying GenAI vs Non-GenAI Multimedia Traffic

This project investigates whether network flows produced by Generative AI applications can be distinguished from traditional non-GenAI multimedia traffic using only flow-level statistical features. We extract features from per-flow packet captures, identify the most discriminative ones with point-biserial correlation, and train Random Forest classifiers for two tasks: a binary GenAI vs Non-GenAI split, and a finer Text vs Audio split within GenAI traffic.

## Team

- Shreya Shitole
- Shravani Vasa

Course: CS692 Mobile Computing, George Mason University, Spring 2026.

## Motivation

GenAI services are now a meaningful fraction of consumer internet traffic, and their on-the-wire behavior is shaped by token-by-token streaming generation rather than by playback buffers. That difference shows up in flow-level statistics, especially in inter-arrival times. A network operator that can fingerprint GenAI traffic in real time can apply tailored QoS, capacity planning, or security policies, all without inspecting payloads. This project tests how far that idea goes when the only inputs are header-level features.

## Dataset

We work with CSV files exported from packet captures. Each CSV represents one session from one application, with columns for timestamp, packet length, source/destination IPs, protocol, and ports. The dataset has 99 sessions in total with a 84/15 class split between GenAI and Non-GenAI, which we handle at training time with `class_weight="balanced"` rather than resampling.

Coverage by application:

| Category | Subcategory | Apps |
|---|---|---|
| GenAI | text | ChatGPT, Gemini, Grok, Perplexity |
| GenAI | audio | ChatGPT (voice), Gemini (voice) |
| GenAI | video | text-to-video and image-to-video sessions |
| Non-GenAI | on_demand_streaming | YouTube, Netflix, Amazon Prime, Hulu, Disney+, TikTok, Twitch |
| Non-GenAI | browsing | Chrome, Safari, Brave, Google |
| Non-GenAI | audio_video_calling | Zoom, WhatsApp, Instagram, FaceTime |
| Non-GenAI | gaming | Call of Duty, PUBG, Fortnite |
| Non-GenAI | others | mixed |

The folder layout the notebook expects is:

```
Group/
├── CSV FILES/
│   ├── genai/{audio,text,video}/*.csv
│   └── nongenai/{browsing,gaming,human_human_calling,on_demand_streaming,others}/*.csv
├── GenAI_audio/*.csv
└── GenAI_text/*.csv
```

## Feature Engineering

For each session we compute roughly 48 flow-level features grouped into five families.

1. Forward packet size statistics (mean, std, min, max, p25, median, p75, p95)
2. Backward packet size statistics, same eight
3. Overall inter-arrival time (IAT) statistics, same eight
4. Forward IAT statistics, same eight
5. Backward IAT statistics, same eight

On top of these we add aggregate features such as total packets, forward and backward packet counts, forward/backward packet ratio, forward/backward byte ratio, request/response size ratio, flow duration, total bytes, unique destination IPs, and protocol count.

Direction is inferred from the first observed source IP. We rename the standard Wireshark column variants (`frame.time`, `frame.time_epoch`, `frame.len`, `ip.src`, `ip.dst`, `ip.proto`, `tcp.srcport`, `udp.srcport`, etc.) into a single canonical schema before extraction, and we fall back to `pd.to_datetime` when the timestamp column is a string rather than a numeric epoch.

## Feature Selection

We rank features by point-biserial correlation against the binary label, then visualize the top 25 for each task. This gives a quick read on which statistics actually carry signal before we commit to any model. Forward and backward IAT statistics consistently dominate the top of the ranking, which is consistent with the bimodal IAT pattern reported in recent GenAI traffic literature.

## Models

Both tasks use the same Random Forest configuration.

- 100 trees
- `class_weight="balanced"` to handle the 84/15 imbalance
- Stratified 80/20 train/test split with `random_state=42`
- 5-fold stratified cross-validation with `f1_weighted` scoring

**Task 1: Binary GenAI vs Non-GenAI.** The Random Forest reaches roughly 95% accuracy on the held-out set, with IAT-based features taking the top spots in feature importance.

**Task 2: Text vs Audio within GenAI.** The same model is trained on the GenAI-only subset using `subcategory == "text"` as the positive label. Forward packet size statistics and burst-related features rank highest here, which fits the intuition that text streaming produces small steady packets while voice produces larger periodic ones.

## Repository Structure

```
Network Traffic Fingerprinting/
├── README.md
├── Project.ipynb                  # main notebook: feature extraction + RF models
├── data/
│   └── README.md                  # dataset notes; raw CSVs not committed if too large
├── outputs/
│   ├── features_all.csv
│   ├── features_top25_genai_vs_nongenai.csv
│   ├── features_top25_text_vs_audio.csv
│   ├── top25_genai_vs_nongenai.png
│   ├── top25_text_vs_audio.png
│   ├── rf_confusion_genai_vs_nongenai.png
│   ├── rf_confusion_text_vs_audio.png
│   ├── rf_importance_genai_vs_nongenai.png
│   └── rf_importance_text_vs_audio.png
└── requirements.txt
```

## How to Reproduce

### 1. Environment

The project uses Python 3.10 or newer. Install dependencies with:

```bash
pip install pandas numpy scipy scikit-learn matplotlib jupyter
```

### 2. Configure Paths

The notebook currently uses an absolute local path for `BASE`. Before running, edit the first code cell so `BASE` points to the directory that holds your `CSV FILES/` folder. For example:

```python
BASE      = "./data"
CSV_FILES = os.path.join(BASE, "CSV FILES")
```

### 3. Run the Notebook

Open `Project.ipynb` in Jupyter and run the cells in order. The full pipeline is:

1. Define the feature extraction function
2. Walk every CSV in the configured source folders and build `features_all.csv`
3. Compute point-biserial correlations and save the top 25 ranking plots
4. Train and evaluate the Random Forest for the binary task
5. Train and evaluate the Random Forest for the text vs audio task

Each modeling cell prints a classification report, saves a confusion matrix and a feature importance plot, and reports the cross-validated F1 score.

## Results

| Task | Model | Test Accuracy | CV F1 (5-fold) |
| GenAI vs Non-GenAI | Random Forest | ~0.95 | see notebook output |
| GenAI Text vs Audio | Random Forest | see notebook output | see notebook output |

Numerical results are regenerated every run; the saved figures in `outputs/` reflect the most recent run.

## Future Work



## References

1. CS692 Mobile Computing course materials, GMU Spring 2026.
2. Recent IMC work on GenAI traffic characterization, which motivated the focus on inter-arrival time features.
