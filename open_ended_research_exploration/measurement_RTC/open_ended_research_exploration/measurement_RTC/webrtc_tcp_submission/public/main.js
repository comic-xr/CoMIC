//  WebRTC implementation with local file streaming
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const localVideo = document.getElementById('localVideo');
  const remoteVideos = document.getElementById('remoteVideos');
  const statusDiv = document.getElementById('status');
  const peerCountEl = document.getElementById('peerCount');
  const bandwidthEl = document.getElementById('bandwidth');
  const rttEl = document.getElementById('rtt');
  const packetLossEl = document.getElementById('packetLoss');
  const frameRateEl = document.getElementById('frameRate');
  const connectionsListEl = document.getElementById('connectionsList');
  const roleSelect = document.getElementById('role');
  const clientIdInput = document.getElementById('clientId');
  const videoSourceSelect = document.getElementById('videoSource');
  const fileSourceControls = document.getElementById('fileSourceControls');
  const localFileInput = document.getElementById('localFileInput');
  const videoPreview = document.getElementById('videoPreview');
  const automationStatusEl = document.getElementById('automation-status');
  
  // State
  let localStream = null;
  const peerConnections = {};
  let socket = null;
  let statsInterval = null;
  let clientId = '';
  let clientRole = 'auto';
  let localVideoElement = null;
  
  // STUN servers for NAT traversal
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  };
  
  // Initialize
  init();
  
  function init() {
    // Setup event listeners
    videoSourceSelect.addEventListener('change', toggleVideoSourceControls);
    startBtn.addEventListener('click', startStreaming);
    stopBtn.addEventListener('click', stopEverything);
    
    // Setup file input preview
    if (localFileInput) {
      localFileInput.addEventListener('change', handleFileSelection);
    }
    
    // Generate a random client ID if not provided
    clientId = clientIdInput.value || `client-${Math.floor(Math.random() * 10000)}`;
    clientIdInput.value = clientId;
    
    // Check for automation parameters in URL
    checkUrlParams();
    
    // Toggle video source controls initial state
    toggleVideoSourceControls();
    
    // Set up automation status reporting
    window.reportAutomationStatus = (status) => {
      if (automationStatusEl) {
        automationStatusEl.textContent = status;
      }
      console.log('[Automation]', status);
    };
  }
  
  // Handle file selection
  function handleFileSelection(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file');
      return;
    }
    
    // Create preview
    const objectUrl = URL.createObjectURL(file);
    videoPreview.src = objectUrl;
    videoPreview.style.display = 'block';
    
    // Clean up object URL when no longer needed
    videoPreview.onload = () => {
      // URL.revokeObjectURL(objectUrl); // Don't revoke until we're done with it
    };
  }
  
  // Check URL parameters for automation
  function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for client ID
    if (urlParams.has('id')) {
      clientId = urlParams.get('id');
      clientIdInput.value = clientId;
    }
    
    // Check for role
    if (urlParams.has('role')) {
      const role = urlParams.get('role');
      if (['auto', 'sender', 'receiver'].includes(role)) {
        clientRole = role;
        roleSelect.value = role;
        
        // If role is receiver, change video source to webcam for simplicity
        if (role === 'receiver') {
          videoSourceSelect.value = 'webcam';
        }
      }
    }
    
    // Check for video source
    if (urlParams.has('source')) {
      const source = urlParams.get('source');
      if (['file', 'webcam'].includes(source)) {
        videoSourceSelect.value = source;
      }
    }
    
    // Check for metrics interval
    if (urlParams.has('metricsInterval')) {
      window.metricsInterval = parseInt(urlParams.get('metricsInterval'), 10) || 1000;
    }
    
    // Check for autostart
    if (urlParams.has('autostart') && urlParams.get('autostart') === 'true') {
      // Add a slight delay to allow everything to initialize
      setTimeout(() => {
        startStreaming();
      }, 1000);
    }
    
    toggleVideoSourceControls();
  }
  
  // Toggle video source controls based on selection
  function toggleVideoSourceControls() {
    if (videoSourceSelect.value === 'file') {
      fileSourceControls.style.display = 'block';
    } else {
      fileSourceControls.style.display = 'none';
    }
  }

  // Connect to signaling server
  function connectSignaling() {
    socket = io({ query: { clientId, role: roleSelect.value } });
    
    socket.on('connect', () => {
      statusDiv.textContent = `Status: Connected to signaling server (ID: ${clientId})`;
      window.reportAutomationStatus('signaling-connected');
      updatePeerCount();
    });
    
    socket.on('existing-peers', ({ peerIds }) => {
      peerIds.forEach(peerId => {
        const isInitiator = shouldInitiate(peerId);
        createPeerConnection(peerId, isInitiator);
      });
      updatePeerCount();
    });
    
    socket.on('peer-connected', ({ peerId, role }) => {
      const isInitiator = shouldInitiate(peerId);
      createPeerConnection(peerId, isInitiator);
      updatePeerCount();
    });
    
    socket.on('peer-disconnected', ({ peerId }) => {
      if (peerConnections[peerId]) {
        peerConnections[peerId].connection.close();
        delete peerConnections[peerId];
        
        // Remove the remote video element
        const videoEl = document.getElementById(`remote-${peerId}`);
        if (videoEl) {
          videoEl.parentNode.removeChild(videoEl);
        }
        
        updatePeerCount();
        updateConnectionsList();
      }
    });
    
    socket.on('signal', async ({ peerId, signal }) => {
      try {
        if (!peerConnections[peerId]) {
          const isInitiator = shouldInitiate(peerId);
          createPeerConnection(peerId, isInitiator);
        }
        
        const pc = peerConnections[peerId].connection;
        
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', { peerId, signal: pc.localDescription });
        } 
        else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } 
        else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal));
        }
      } catch (error) {
        console.error('Error handling signal:', error);
      }
    });
  }
  
  // Determine if this client should initiate the connection
  function shouldInitiate(peerId) {
    const role = roleSelect.value;
    
    if (role === 'sender') {
      return true;
    } else if (role === 'receiver') {
      return false;
    } else {
      // Auto - determine based on client ID
      return clientId.localeCompare(peerId) > 0;
    }
  }

  // Create a new peer connection
  function createPeerConnection(peerId, isInitiator) {
    // For receivers, we may not need a local stream for media
    const isReceiver = roleSelect.value === 'receiver';
    
    // Only check local stream if we're not a receiver or if we need to send audio/video
    if (!isReceiver && !localStream) {
      console.error('Cannot create peer connection without local stream');
      return null;
    }
    
    const pc = new RTCPeerConnection(iceServers);
    
    // Add local stream tracks to the connection if we have them and aren't just receiving
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', {
          peerId,
          signal: event.candidate
        });
      }
    };
    
    // Log ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerId}: ${pc.iceConnectionState}`);
      updateConnectionsList();
      
      if (pc.iceConnectionState === 'connected') {
        window.reportAutomationStatus(`peer-connected-${peerId}`);
      } else if (pc.iceConnectionState === 'disconnected' || 
                 pc.iceConnectionState === 'failed' || 
                 pc.iceConnectionState === 'closed') {
        window.reportAutomationStatus(`peer-disconnected-${peerId}`);
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}: ${pc.connectionState}`);
      updateConnectionsList();
    };
    
    // Handle receiving remote tracks
    pc.ontrack = (event) => {
      // Create a new video element for this peer if it doesn't exist
      let videoEl = document.getElementById(`remote-${peerId}`);
      
      if (!videoEl) {
        const div = document.createElement('div');
        div.className = 'remote-video-container';
        
        videoEl = document.createElement('video');
        videoEl.id = `remote-${peerId}`;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.className = 'remote-video';
        
        const label = document.createElement('div');
        label.textContent = `Peer: ${peerId}`;
        label.className = 'video-label';
        
        div.appendChild(videoEl);
        div.appendChild(label);
        remoteVideos.appendChild(div);
      }
      
      videoEl.srcObject = event.streams[0];
      window.reportAutomationStatus(`received-track-${peerId}`);
    };
    
    // If we're the initiator, create and send an offer
    if (isInitiator) {
      pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        socket.emit('signal', {
          peerId,
          signal: pc.localDescription
        });
        window.reportAutomationStatus(`sent-offer-${peerId}`);
      })
      .catch(error => console.error('Error creating offer:', error));
    }
    
    // Store the peer connection
    peerConnections[peerId] = { 
      connection: pc,
      statsTimestamp: Date.now()
    };
    
    updatePeerCount();
    updateConnectionsList();
    return pc;
  }

  // Start streaming - setup local stream and connect to signaling
  async function startStreaming() {
    try {
      // Update role and client ID
      clientRole = roleSelect.value;
      clientId = clientIdInput.value || clientId;
      
      // For receivers, we can connect without a local stream
      const isReceiver = roleSelect.value === 'receiver';
      
      if (!isReceiver) {
        // Get stream based on selected source for non-receivers
        if (videoSourceSelect.value === 'webcam') {
          localStream = await getWebcamStream();
        } else {
          localStream = await getLocalFileStream();
        }
        
        if (!localStream) {
          throw new Error('Failed to create local stream');
        }
        
        // Display local stream
        localVideo.srcObject = localStream;
      } else {
        // For receivers, just use a minimal audio stream
        try {
          // Create silent audio track
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const destination = audioContext.createMediaStreamDestination();
          oscillator.connect(destination);
          oscillator.frequency.value = 0; // Silent
          oscillator.start();
          
          localStream = destination.stream;
          
          // Optionally try to get webcam for local preview if needed
          try {
            const webcamStream = await navigator.mediaDevices.getUserMedia({ 
              video: { width: 320, height: 240 },
              audio: false
            });
            
            // Display webcam stream as local preview
            localVideo.srcObject = webcamStream;
            
            // Add video track to our local stream
            webcamStream.getVideoTracks().forEach(track => {
              localStream.addTrack(track);
            });
          } catch (webcamError) {
            console.log('Could not get webcam access, using audio only: ' + webcamError.message);
          }
        } catch (audioError) {
          console.log('Could not create audio context: ' + audioError.message);
          // Continue without local stream for receivers
        }
      }
      
      // Enable/disable buttons
      startBtn.disabled = true;
      stopBtn.disabled = false;
      roleSelect.disabled = true;
      clientIdInput.disabled = true;
      videoSourceSelect.disabled = true;
      if (localFileInput) localFileInput.disabled = true;
      
      // Connect to signaling server
      connectSignaling();
      
      // Start collecting stats
      if (statsInterval) clearInterval(statsInterval);
      statsInterval = setInterval(collectStats, window.metricsInterval || 1000);
      
      window.reportAutomationStatus('streaming-started');
      
    } catch (error) {
      console.error('Error starting stream:', error);
      statusDiv.textContent = `Status: Error - ${error.message}`;
      window.reportAutomationStatus(`error-${error.message}`);
    }
  }
  
  // Get stream from webcam/microphone
  async function getWebcamStream() {
    try {
      return await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: true
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('Cannot access camera/microphone');
    }
  }
  
  // Get stream from local video file
  async function getLocalFileStream() {
    return new Promise((resolve, reject) => {
      try {
        if (!localFileInput || !localFileInput.files || localFileInput.files.length === 0) {
          reject(new Error('No video file selected'));
          return;
        }
        
        const file = localFileInput.files[0];
        
        // Check if it's a video file
        if (!file.type.startsWith('video/')) {
          reject(new Error('Selected file is not a video'));
          return;
        }
        
        // Create a video element to play the local file
        if (!localVideoElement) {
          localVideoElement = document.createElement('video');
          localVideoElement.style.display = 'none';
          document.body.appendChild(localVideoElement);
        }
        
        // Create object URL for the file
        const objectUrl = URL.createObjectURL(file);
        localVideoElement.src = objectUrl;
        localVideoElement.onloadedmetadata = () => {
          localVideoElement.play().then(() => {
            // Set loop to true to continuously stream the video
            localVideoElement.loop = true;
            
            const stream = localVideoElement.captureStream();
            
            // Add audio if needed
            if (stream.getAudioTracks().length === 0) {
              // Create silent audio track if video doesn't have audio
              const audioContext = new AudioContext();
              const oscillator = audioContext.createOscillator();
              const destination = audioContext.createMediaStreamDestination();
              oscillator.connect(destination);
              oscillator.frequency.value = 0; // Silent
              oscillator.start();
              
              const audioTrack = destination.stream.getAudioTracks()[0];
              stream.addTrack(audioTrack);
            }
            
            resolve(stream);
          }).catch(error => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Error playing video file: ${error.message}`));
          });
        };
        
        localVideoElement.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Error loading video file'));
        };
      } catch (error) {
        reject(new Error(`Error creating stream from file: ${error.message}`));
      }
    });
  }

  // Stop everything and clean up
  function stopEverything() {
    // Stop stats collection
    if (statsInterval) {
      clearInterval(statsInterval);
      statsInterval = null;
    }
    
    // Close all peer connections
    Object.keys(peerConnections).forEach(peerId => {
      peerConnections[peerId].connection.close();
    });
    
    // Clear peer connections object
    Object.keys(peerConnections).forEach(key => delete peerConnections[key]);
    
    // Stop local video element if it exists
    if (localVideoElement) {
      localVideoElement.pause();
      if (localVideoElement.src) {
        URL.revokeObjectURL(localVideoElement.src);
      }
    }
    
    // Stop video preview if it exists
    if (videoPreview && videoPreview.src) {
      videoPreview.pause();
      URL.revokeObjectURL(videoPreview.src);
      videoPreview.src = '';
    }
    
    // Stop local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localVideo.srcObject = null;
      localStream = null;
    }
    
    // Disconnect from signaling server
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    
    // Reset UI
    remoteVideos.innerHTML = '';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    roleSelect.disabled = false;
    clientIdInput.disabled = false;
    videoSourceSelect.disabled = false;
    if (localFileInput) localFileInput.disabled = false;
    statusDiv.textContent = 'Status: Disconnected';
    peerCountEl.textContent = '0';
    bandwidthEl.textContent = '0 kbps';
    rttEl.textContent = '0 ms';
    packetLossEl.textContent = '0%';
    frameRateEl.textContent = '0 fps';
    connectionsListEl.innerHTML = '';
    
    window.reportAutomationStatus('streaming-stopped');
  }

  // Update the peer count display
  function updatePeerCount() {
    const count = Object.keys(peerConnections).length;
    peerCountEl.textContent = count;
  }

  // Update the connections list
  function updateConnectionsList() {
    connectionsListEl.innerHTML = '';
    
    Object.keys(peerConnections).forEach(peerId => {
      const pc = peerConnections[peerId].connection;
      const li = document.createElement('li');
      li.textContent = `${peerId} - ${pc.connectionState} (ICE: ${pc.iceConnectionState})`;
      connectionsListEl.appendChild(li);
    });
  }

  // Collect WebRTC stats for performance monitoring
  async function collectStats() {
    let totalBitrate = 0;
    let totalRtt = 0;
    let totalPacketLoss = 0;
    let totalFrameRate = 0;
    let activeConnections = 0;
    
    for (const peerId in peerConnections) {
      const pc = peerConnections[peerId].connection;
      
      if (pc.connectionState === 'connected') {
        activeConnections++;
        
        try {
          const stats = await pc.getStats();
          let videoBytesReceived = 0;
          let videoBytesSent = 0;
          let audioBytesReceived = 0;
          let audioBytesSent = 0;
          let rtt = 0;
          let packetsLost = 0;
          let totalPackets = 0;
          let frameRate = 0;
          
          // Process stats data
          stats.forEach(report => {
            const now = Date.now();
            
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              const bytes = report.bytesReceived;
              const prevBytes = peerConnections[peerId].lastVideoReceivedBytes || 0;
              const deltaTime = now - (peerConnections[peerId].statsTimestamp || now);
              
              if (deltaTime > 0 && prevBytes > 0) {
                videoBytesReceived = 8 * (bytes - prevBytes) / deltaTime; // bits per ms = kbps
              }
              
              peerConnections[peerId].lastVideoReceivedBytes = bytes;
              
              // Frame rate for inbound video
              if (report.framesPerSecond) {
                frameRate = report.framesPerSecond;
              }
              
              // Packet loss for inbound video
              if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
                packetsLost += report.packetsLost;
                totalPackets += (report.packetsReceived + report.packetsLost);
              }
            }
            
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              const bytes = report.bytesSent;
              const prevBytes = peerConnections[peerId].lastVideoSentBytes || 0;
              const deltaTime = now - (peerConnections[peerId].statsTimestamp || now);
              
              if (deltaTime > 0 && prevBytes > 0) {
                videoBytesSent = 8 * (bytes - prevBytes) / deltaTime; // bits per ms = kbps
              }
              
              peerConnections[peerId].lastVideoSentBytes = bytes;
              
              // Frame rate for outbound video
              if (report.framesPerSecond) {
                frameRate = report.framesPerSecond;
              }
            }
            
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              const bytes = report.bytesReceived;
              const prevBytes = peerConnections[peerId].lastAudioReceivedBytes || 0;
              const deltaTime = now - (peerConnections[peerId].statsTimestamp || now);
              
              if (deltaTime > 0 && prevBytes > 0) {
                audioBytesReceived = 8 * (bytes - prevBytes) / deltaTime; // bits per ms = kbps
              }
              
              peerConnections[peerId].lastAudioReceivedBytes = bytes;
            }
            
            if (report.type === 'outbound-rtp' && report.kind === 'audio') {
              const bytes = report.bytesSent;
              const prevBytes = peerConnections[peerId].lastAudioSentBytes || 0;
              const deltaTime = now - (peerConnections[peerId].statsTimestamp || now);
              
              if (deltaTime > 0 && prevBytes > 0) {
                audioBytesSent = 8 * (bytes - prevBytes) / deltaTime; // bits per ms = kbps
              }
              
              peerConnections[peerId].lastAudioSentBytes = bytes;
            }
            
            if (report.type === 'remote-inbound-rtp') {
              if (report.roundTripTime) {
                rtt = report.roundTripTime * 1000; // Convert to ms
              }
            }
          });
          
          // Update timestamp
          peerConnections[peerId].statsTimestamp = Date.now();
          
          // Sum up metrics for the average
          const totalBitrateForPeer = videoBytesReceived + videoBytesSent + audioBytesReceived + audioBytesSent;
          totalBitrate += totalBitrateForPeer;
          
          if (rtt > 0) {
            totalRtt += rtt;
          }
          
          if (totalPackets > 0) {
            const packetLossRate = (packetsLost / totalPackets) * 100;
            totalPacketLoss += packetLossRate;
          }
          
          if (frameRate > 0) {
            totalFrameRate += frameRate;
          }
          
        } catch (error) {
          console.error('Error getting stats:', error);
        }
      }
    }
    
    // Update the UI with the metrics
    if (activeConnections > 0) {
      // Calculate averages
      const avgBitrate = totalBitrate / activeConnections;
      const avgRtt = totalRtt / activeConnections;
      const avgPacketLoss = totalPacketLoss / activeConnections;
      const avgFrameRate = totalFrameRate / activeConnections;
      
      // Update UI
      bandwidthEl.textContent = `${avgBitrate.toFixed(2)} kbps`;
      rttEl.textContent = `${avgRtt.toFixed(2)} ms`;
      packetLossEl.textContent = `${avgPacketLoss.toFixed(2)}%`;
      frameRateEl.textContent = `${avgFrameRate.toFixed(2)} fps`;
      
      // Report for automation
      window.reportAutomationStatus(`metrics-updated-bandwidth-${Math.round(avgBitrate)}-rtt-${Math.round(avgRtt)}-loss-${Math.round(avgPacketLoss)}-fps-${Math.round(avgFrameRate)}`);
    } else {
      bandwidthEl.textContent = '0 kbps';
      rttEl.textContent = '0 ms';
      packetLossEl.textContent = '0%';
      frameRateEl.textContent = '0 fps';
    }
  }
});