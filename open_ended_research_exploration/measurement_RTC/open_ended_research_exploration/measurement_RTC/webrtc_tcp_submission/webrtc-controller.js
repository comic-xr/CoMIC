// server.js - Node.js signaling server with automation support
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Create videos directory if it doesn't exist
const videosDir = path.join(__dirname, 'public', 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
  console.log('Created videos directory');
}

// Check if test videos exist, otherwise log a warning
const testVideos = [
  'test-video-360p.mp4',
  'test-video-720p.mp4',
  'test-video-1080p.mp4'
];

testVideos.forEach(video => {
  const videoPath = path.join(videosDir, video);
  if (!fs.existsSync(videoPath)) {
    console.warn(`Warning: Test video ${video} not found at ${videoPath}`);
    console.warn('Please add test videos to the /public/videos directory');
  }
});

// Client tracking with roles
const clients = {};

io.on('connection', (socket) => {
  // Get client ID and role from query parameters
  const clientId = socket.handshake.query.clientId || socket.id;
  const role = socket.handshake.query.role || 'auto';
  
  console.log(`Client connected: ${clientId} (Role: ${role})`);
  
  // Register this client
  clients[clientId] = {
    socket: socket,
    role: role
  };
  
  // Notify everyone about the new peer
  socket.broadcast.emit('peer-connected', { 
    peerId: clientId,
    role: role
  });
  
  // Send list of existing peers to the new peer
  const existingPeers = Object.keys(clients)
    .filter(id => id !== clientId)
    .map(id => ({
      peerId: id,
      role: clients[id].role
    }));
    
  if (existingPeers.length > 0) {
    socket.emit('existing-peers', { peerIds: existingPeers.map(peer => peer.peerId) });
  }

  // Handle signaling messages
  socket.on('signal', (data) => {
    const { peerId, signal } = data;
    if (clients[peerId]) {
      console.log(`Forwarding signal from ${clientId} to ${peerId}`);
      clients[peerId].socket.emit('signal', {
        peerId: clientId,
        signal: signal
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${clientId}`);
    delete clients[clientId];
    io.emit('peer-disconnected', { peerId: clientId });
  });
  
  // Handle automation commands
  socket.on('automation', (data) => {
    const { command, params } = data;
    console.log(`Received automation command: ${command}`, params);
    
    switch (command) {
      case 'network-condition':
        applyNetworkCondition(params);
        socket.emit('automation-response', { 
          command,
          status: 'applied',
          params
        });
        break;
      default:
        socket.emit('automation-response', { 
          command,
          status: 'unknown-command',
          error: 'Unknown command'
        });
    }
  });
});

// Apply network conditions for testing (Linux only with tc)
function applyNetworkCondition({ delay = 0, loss = 0, bandwidth = 0 }) {
  // This only works on Linux with the tc command
  if (process.platform !== 'linux') {
    console.warn('Network condition simulation only available on Linux with tc');
    return false;
  }
  
  try {
    // Clear existing rules
    exec('tc qdisc del dev lo root', () => {
      // Add new rules
      const cmd = `tc qdisc add dev lo root netem delay ${delay}ms loss ${loss}% rate ${bandwidth}kbit`;
      console.log(`Applying network condition: ${cmd}`);
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Network condition error: ${error.message}`);
          return false;
        }
        if (stderr) {
          console.error(`Network condition stderr: ${stderr}`);
          return false;
        }
        console.log(`Network condition applied: ${stdout}`);
        return true;
      });
    });
  } catch (error) {
    console.error('Failed to apply network condition:', error);
    return false;
  }
}

// API endpoint for automation
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    clients: Object.keys(clients).map(id => ({
      id,
      role: clients[id].role
    })),
    timestamp: Date.now()
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});