# Performance Analysis of LLM Inference Across Web Browser Backends
This folder contains code for analyzing and comparing the performance of WebLLM running in different browsers/backends against native LLM implementations.

The project is organized into following parts:
1. Inference Automation (/WebLLM/automation.js)
This part handles the automation of WebLLM inference and collection of performance metrics. There's another README.md file inside the folder with detailed steps for setup and execution.

2. Native LLM Comparison (/WebLLM/nativeLLM.py)
Compared browser-based LLMs with their native counterparts.

3. LLM Evaluation (/WebLLM/eval.py)
Evaluating the LLM outputs with metrics like correctness, hallucination, answer relevancy etc.

4. Resource Monitoring (/Monitoring)
For monitoring system resource usage (CPU/GPU Profiling) during browser-based LLM inference.
