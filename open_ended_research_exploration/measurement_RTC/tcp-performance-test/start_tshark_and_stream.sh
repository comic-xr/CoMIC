#!/bin/bash

# Start a new detached tmux session named 'receiverstream'
tmux new-session -d -s receiverstream

# Pane 1: Create results directory if it doesn't exist
tmux send-keys -t receiverstream "mkdir -p /root/webrtc-performance-test/results/tcp" C-m

# Pane 1: Start tshark to log TCP RTT data to a CSV file
tmux send-keys -t receiverstream "tshark -i any -f 'tcp port 12345' -T fields -e frame.time_relative -e ip.src -e ip.dst -e tcp.analysis.ack_rtt -E header=y -E separator=, -E quote=d -E occurrence=f | tee /root/webrtc-performance-test/results/tcp/tcp_rtt_log.csv" C-m

# Split the tmux window vertically to create Pane 2
tmux split-window -v -t receiverstream

# Pane 2: Start ffmpeg to listen for incoming TCP stream and discard output
tmux send-keys -t receiverstream "timeout 35 xvfb-run -a ffmpeg -loglevel info -listen 1 -i tcp://0.0.0.0:12345 -f null -" C-m

# Focus on Pane 1 by default
tmux select-pane -t receiverstream:0.0

# Attach to the 'receiverstream' session to view both panes live
tmux attach -t receiverstream
