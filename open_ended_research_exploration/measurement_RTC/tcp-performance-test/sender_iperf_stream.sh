#!/bin/bash

# Start a new detached tmux session named 'streamtest'
tmux new-session -d -s streamtest

# Pane 1: Create results directory if it doesn't exist
tmux send-keys -t streamtest "mkdir -p /root/webrtc-performance-test/results/tcp" C-m

# Pane 1: Run iperf3 client and log output to a file
tmux send-keys -t streamtest "iperf3 -c 64.227.187.210 -t 30 | tee /root/webrtc-performance-test/results/tcp/iperf3-log.txt" C-m

# Split the tmux window vertically to create Pane 2
tmux split-window -v -t streamtest

# Pane 2: Start ffmpeg to stream the test video over TCP
tmux send-keys -t streamtest "ffmpeg -loglevel info -re -i /root/webrtc-performance-test/test-video-1080p.mp4 -f mpegts tcp://64.227.187.210:12345" C-m

# Focus on Pane 1 by default
tmux select-pane -t streamtest:0.0

# Attach to the 'streamtest' session so user can see both panes
tmux attach -t streamtest
