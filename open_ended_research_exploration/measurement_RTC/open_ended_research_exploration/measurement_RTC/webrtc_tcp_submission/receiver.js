// receiver.js - WebRTC Receiver for performance testing with headless support
// Enhanced with data usage and video quality reporting
const puppeteer = require('puppeteer');
const { program } = require('commander');
const os = require('os');
const fs = require('fs');

// Command line options
program
  .option('-s, --server <url>', 'Server URL', 'http://localhost:4000')
  .option('-i, --id <id>', 'Receiver ID', 'receiver-client')
  .option('--chrome-path <path>', 'Custom path to Chrome executable')
  .option('--duration <seconds>', 'Duration to run the receiver in seconds after connection (0 for unlimited)', 0)
  .option('--connection-timeout <seconds>', 'Maximum time to wait for connection in seconds', 120)
  .option('--report-interval <seconds>', 'Interval in seconds for reporting data usage and quality', 5)
  .option('--output-file <path>', 'Path to save the report data as JSON', '')
  .option('--headless <boolean>', 'Run in headless mode', true)
  .parse(process.argv);

const options = program.opts();

// Determine Chrome path based on platform
function getChromePath() {
  // Use custom path if provided
  if (options.chromePath) {
    return options.chromePath;
  }
  
  // Detect platform and set Chrome path
  const platform = os.platform();
  let chromePath;
  
  if (platform === 'darwin') {
    // macOS
    chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else if (platform === 'linux') {
    // Linux
    chromePath = '/usr/bin/google-chrome';
  } else if (platform === 'win32') {
    // Windows
    chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else {
    chromePath = null;
  }
  
  console.log(`Detected platform: ${platform}`);
  console.log(`Using Chrome path: ${chromePath}`);
  
  return chromePath;
}

// Function to format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  if (isNaN(bytes)) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format date and time for log entries
function getTimestamp() {
  const now = new Date();
  return now.toISOString();
}

// Gracefully shutdown the receiver
async function shutdownReceiver(browser, reportData) {
  console.log('Shutting down receiver gracefully...');
  
  // Save report data if output file is specified
  if (options.outputFile && reportData && reportData.length > 0) {
    try {
      fs.writeFileSync(options.outputFile, JSON.stringify(reportData, null, 2));
      console.log(`Report data saved to ${options.outputFile}`);
    } catch (error) {
      console.error(`Error saving report data: ${error.message}`);
    }
  }
  
  await browser.close();
  console.log('Receiver stopped successfully.');
  process.exit(0);
}

// Wait for peer connection to be established
async function waitForConnection(page, maxWaitTime) {
  console.log('Waiting for peer connection...');
  
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    // Set up a listener for automation status messages
    const connectionCheckInterval = setInterval(async () => {
      // Check if time exceeded
      if (Date.now() - startTime > maxWaitTime) {
        clearInterval(connectionCheckInterval);
        console.log('Connection timeout - no peers connected within the allowed time.');
        resolve(false);
        return;
      }
      
      // Check if we have a connection by looking at peer count
      const peerCount = await page.evaluate(() => {
        return parseInt(document.getElementById('peerCount')?.textContent) || 0;
      }).catch(() => 0);
      
      if (peerCount > 0) {
        clearInterval(connectionCheckInterval);
        console.log(`Connection established! Peer count: ${peerCount}`);
        resolve(true);
        return;
      }
      
      // Check for peer connections directly
      const hasPeerConnection = await page.evaluate(() => {
        return window.peerConnections && Object.keys(window.peerConnections).length > 0;
      }).catch(() => false);
      
      if (hasPeerConnection) {
        clearInterval(connectionCheckInterval);
        console.log(`Connection established! (detected peer connection object)`);
        resolve(true);
        return;
      }
      
      // Log progress every 10 seconds
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      if (elapsedSeconds % 10 === 0 && elapsedSeconds > 0) {
        console.log(`Still waiting for connection... (${elapsedSeconds}s elapsed)`);
      }
    }, 1000);
    
    // Also set up a direct listener for the peer-connected automation event
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Automation] peer-connected') || 
          text.includes('[Automation] received-track')) {
        clearInterval(connectionCheckInterval);
        console.log('Connection established! (detected from automation event)');
        resolve(true);
      }
    });
  });
}

// Get browser-side connection stats or parse metrics from automation messages
async function getConnectionStats(page) {
  // First try to check for automation metrics in console logs
  const automationMetrics = await page.evaluate(() => {
    // Check if we have a global variable with metrics
    if (window.lastMetrics) {
      return window.lastMetrics;
    }
    return null;
  }).catch(() => null);
  
  if (automationMetrics) {
    return {
      timestamp: new Date().toISOString(),
      bytesReceived: automationMetrics.bytesReceived || 0,
      bytesSent: automationMetrics.bytesSent || 0,
      packetsReceived: automationMetrics.packetsReceived || 0,
      packetsSent: automationMetrics.packetsSent || 0,
      packetLoss: automationMetrics.loss || 0,
      videoResolution: { 
        width: automationMetrics.width || 0, 
        height: automationMetrics.height || 0 
      },
      framerate: automationMetrics.fps || 0,
      bandwidth: { 
        incoming: automationMetrics.bandwidth || 0, 
        outgoing: 0 
      },
      roundTripTime: automationMetrics.rtt || 0
    };
  }
  
  // If no automation metrics, try to get WebRTC stats directly
  try {
    return await page.evaluate(() => {
      return new Promise(async (resolve) => {
        try {
          // Get the RTCPeerConnection - in headless mode, we might need to check window.peerConnections
          let pc = window.peerConnection;
          
          // If no direct peerConnection, try to find it in peerConnections object
          if (!pc && window.peerConnections) {
            const peerIds = Object.keys(window.peerConnections);
            if (peerIds.length > 0) {
              pc = window.peerConnections[peerIds[0]].connection;
            }
          }
          
          if (!pc) {
            // Fallback with default values
            resolve({
              timestamp: new Date().toISOString(),
              bytesReceived: 0,
              bytesSent: 0,
              packetsReceived: 0,
              packetsSent: 0,
              packetLoss: 0,
              videoResolution: { width: 0, height: 0 },
              framerate: 0,
              bandwidth: { incoming: 0, outgoing: 0 },
              roundTripTime: 0
            });
            return;
          }
          
          const stats = await pc.getStats();
          
          const result = {
            timestamp: new Date().toISOString(),
            bytesReceived: 0,
            bytesSent: 0,
            packetsReceived: 0,
            packetsSent: 0,
            packetLoss: 0,
            videoResolution: { width: 0, height: 0 },
            framerate: 0,
            bandwidth: { incoming: 0, outgoing: 0 },
            roundTripTime: 0
          };
          
          // Process statistics
          stats.forEach(stat => {
            // Track inbound-rtp stats (data received)
            if (stat.type === 'inbound-rtp' && !stat.isRemote) {
              result.bytesReceived += stat.bytesReceived || 0;
              result.packetsReceived += stat.packetsReceived || 0;
              
              // Check for video track to get resolution info
              if (stat.kind === 'video' && stat.frameWidth && stat.frameHeight) {
                result.videoResolution.width = stat.frameWidth;
                result.videoResolution.height = stat.frameHeight;
                result.framerate = stat.framesPerSecond || 0;
              }
            }
            
            // Track outbound-rtp stats (data sent)
            if (stat.type === 'outbound-rtp' && !stat.isRemote) {
              result.bytesSent += stat.bytesSent || 0;
              result.packetsSent += stat.packetsSent || 0;
            }
            
            // Get RTT from remote-inbound-rtp
            if (stat.type === 'remote-inbound-rtp') {
              result.roundTripTime = stat.roundTripTime || 0;
            }
            
            // Get packet loss
            if (stat.type === 'remote-inbound-rtp' && stat.packetsLost) {
              result.packetLoss += stat.packetsLost;
            }
            
            // Get bandwidth estimates
            if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
              if (stat.availableOutgoingBitrate) {
                result.bandwidth.outgoing = Math.round(stat.availableOutgoingBitrate / 1000); // kbps
              }
              if (stat.availableIncomingBitrate) {
                result.bandwidth.incoming = Math.round(stat.availableIncomingBitrate / 1000); // kbps
              }
            }
          });
          
          // Calculate packet loss percentage
          if (result.packetsReceived > 0 && result.packetLoss > 0) {
            result.packetLossPercentage = ((result.packetLoss / (result.packetsReceived + result.packetLoss)) * 100).toFixed(2);
          } else {
            result.packetLossPercentage = "0.00";
          }
          
          resolve(result);
        } catch (error) {
          // Fallback with default values on error
          resolve({
            timestamp: new Date().toISOString(),
            bytesReceived: 0,
            bytesSent: 0,
            packetsReceived: 0,
            packetsSent: 0,
            packetLoss: 0,
            videoResolution: { width: 0, height: 0 },
            framerate: 0,
            bandwidth: { incoming: 0, outgoing: 0 },
            roundTripTime: 0,
            error: error.toString()
          });
        }
      });
    });
  } catch (error) {
    // Return default values if page.evaluate fails
    return {
      timestamp: new Date().toISOString(),
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
      packetLoss: 0,
      videoResolution: { width: 0, height: 0 },
      framerate: 0,
      bandwidth: { incoming: 0, outgoing: 0 },
      roundTripTime: 0,
      error: error.toString()
    };
  }
}

// Get video element dimensions
async function getVideoElementInfo(page) {
  try {
    return await page.evaluate(() => {
      const videoElement = document.querySelector('video');
      if (!videoElement) return { error: 'No video element found' };
      
      return {
        renderedWidth: videoElement.clientWidth,
        renderedHeight: videoElement.clientHeight,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        playing: !videoElement.paused,
        muted: videoElement.muted,
        volume: videoElement.volume
      };
    });
  } catch (error) {
    return {
      renderedWidth: 0,
      renderedHeight: 0,
      videoWidth: 0,
      videoHeight: 0,
      playing: false,
      error: error.toString()
    };
  }
}

// Main function
async function runReceiver() {
  console.log(`Starting WebRTC receiver on ${options.server}`);
  console.log(`Receiver ID: ${options.id}`);
  
  if (options.duration > 0) {
    console.log(`Test duration: ${options.duration} seconds (after connection)`);
  } else {
    console.log('Test duration: Unlimited (run until manually stopped)');
  }
  
  console.log(`Reporting interval: ${options.reportInterval || 5} seconds`);
  if (options.outputFile) {
    console.log(`Output file for report data: ${options.outputFile}`);
  }
  
  const chromePath = getChromePath();
  const connectionTimeout = (options.connectionTimeout || 120) * 1000;
  const reportInterval = (options.reportInterval || 5) * 1000;
  const headless = options.headless === 'false' ? false : true;
  
  console.log(`Running in ${headless ? 'headless' : 'visible'} mode`);
  
  // Array to store report data for saving to file
  const reportData = [];
  let lastBytesSent = 0;
  let lastBytesReceived = 0;
  let connectionStartTime = null;
  
  try {
    // Create a unique profile directory to avoid session restore prompts
    const userDataDir = `./chrome_profile_receiver_${Date.now()}`;
    
    // Launch browser
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: headless ? 'new' : false, // Use 'new' for newer versions of Puppeteer
      executablePath: chromePath,
      userDataDir: userDataDir,
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Overcome limited resource problems
        '--disable-web-security',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--allow-file-access',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-session-crashed-bubble',
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
        '--mute-audio'
      ]
    });
    
    // Create page
    const page = await browser.newPage();
    
    // Setup console logging
    page.on('console', msg => console.log(`[PAGE] ${msg.text()}`));
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));
    
    // Set longer timeout for resource loading
    page.setDefaultNavigationTimeout(120000);
    
    // Navigate to the application with role parameters
    const url = `${options.server}?id=${options.id}&role=receiver&autostart=true`;
    console.log(`Navigating to: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
      console.log('Page loaded successfully');
    } catch (error) {
      console.warn(`Warning: Navigation completed with issue: ${error.message}`);
      console.log('Continuing anyway as the application may still function correctly...');
      
      // Try to continue anyway - just wait a bit more
      await page.waitForTimeout(5000);
    }
    
    // Give the page some time to initialize
    await page.waitForTimeout(2000);
    
    // Click the start button
    console.log('Clicking start button...');
    await page.evaluate(() => {
      const startBtn = document.getElementById('startBtn');
      if (startBtn && !startBtn.disabled) {
        startBtn.click();
        return true;
      }
      return false;
    }).catch(error => {
      console.warn(`Warning: Could not click start button: ${error.message}`);
    });
    
    // Inject script to directly get WebRTC stream resolution
    await page.evaluate(() => {
      // Create global variable to store metrics including resolution
      window.lastMetrics = {
        bandwidth: 0,
        rtt: 0,
        loss: 0,
        fps: 0,
        bytesReceived: 0,
        bytesSent: 0,
        width: 0,
        height: 0
      };
      
      // Store the original peerConnection creation to intercept it
      if (window.RTCPeerConnection) {
        const originalRTCPeerConnection = window.RTCPeerConnection;
        
        window.RTCPeerConnection = function() {
          // Create the actual peer connection
          const pc = new originalRTCPeerConnection(...arguments);
          
          // Store it globally for easier access
          window.peerConnection = pc;
          
          // Intercept ontrack to get video tracks
          const originalOntrack = pc.ontrack;
          pc.ontrack = function(event) {
            console.log('[Debug] Track received', event.track.kind);
            
            // If this is a video track, monitor its settings
            if (event.track && event.track.kind === 'video') {
              console.log('[Debug] Video track received');
              
              // Check track settings immediately
              const settings = event.track.getSettings();
              if (settings.width && settings.height) {
                console.log(`[Debug] Initial video settings: ${settings.width}x${settings.height}, ${settings.frameRate || 'unknown'} fps`);
                window.lastMetrics.width = settings.width;
                window.lastMetrics.height = settings.height;
                if (settings.frameRate) {
                  window.lastMetrics.fps = settings.frameRate;
                }
              }
              
              // Setup periodic checks for this track's settings
              const checkTrackSettings = () => {
                try {
                  const currentSettings = event.track.getSettings();
                  if (currentSettings.width && currentSettings.height) {
                    window.lastMetrics.width = currentSettings.width;
                    window.lastMetrics.height = currentSettings.height;
                    console.log(`[Debug] Track settings updated: ${currentSettings.width}x${currentSettings.height}`);
                  }
                  if (currentSettings.frameRate) {
                    window.lastMetrics.fps = currentSettings.frameRate;
                  }
                } catch (e) {
                  // Track might be ended
                }
              };
              
              // Check settings periodically
              const trackMonitor = setInterval(checkTrackSettings, 2000);
              
              // Stop monitoring if track ends
              event.track.onended = () => {
                clearInterval(trackMonitor);
              };
            }
            
            // Call the original handler
            if (typeof originalOntrack === 'function') {
              return originalOntrack.apply(this, arguments);
            }
          };
          
          return pc;
        };
      }
      
      // Also intercept addTrack to monitor video tracks 
      if (window.RTCPeerConnection && window.RTCPeerConnection.prototype) {
        const originalAddTrack = RTCPeerConnection.prototype.addTrack;
        RTCPeerConnection.prototype.addTrack = function(track, ...streams) {
          if (track && track.kind === 'video') {
            console.log('[Debug] Video track added to PeerConnection');
            
            // Monitor this track's settings
            const checkTrackSettings = () => {
              try {
                const settings = track.getSettings();
                if (settings.width && settings.height) {
                  window.lastMetrics.width = settings.width;
                  window.lastMetrics.height = settings.height;
                  if (settings.frameRate) {
                    window.lastMetrics.fps = settings.frameRate;
                  }
                }
              } catch (e) {
                // Track might be ended
              }
            };
            
            // Initial check
            checkTrackSettings();
            
            // Set up interval
            const trackMonitor = setInterval(checkTrackSettings, 2000);
            
            // Clean up on track end
            track.onended = () => {
              clearInterval(trackMonitor);
            };
          }
          
          // Call original function
          return originalAddTrack.call(this, track, ...streams);
        };
      }
      
      // Periodically check all video elements as fallback
      setInterval(() => {
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          if (video.videoWidth && video.videoHeight) {
            window.lastMetrics.width = video.videoWidth;
            window.lastMetrics.height = video.videoHeight;
          }
        });
      }, 1000);
      
      // Parse automation metrics messages
      const originalConsoleLog = console.log;
      console.log = function() {
        const message = Array.from(arguments).join(' ');
        
        // Parse metrics-updated messages
        if (message.includes('[Automation] metrics-updated')) {
          try {
            // Parse message like: [Automation] metrics-updated-bandwidth-2088-rtt-6-loss-0-fps-28
            const parts = message.split('-');
            // Extract metrics
            for (let i = 0; i < parts.length; i++) {
              if (parts[i] === 'bandwidth' && i+1 < parts.length) {
                window.lastMetrics.bandwidth = parseInt(parts[i+1], 10);
              }
              if (parts[i] === 'rtt' && i+1 < parts.length) {
                window.lastMetrics.rtt = parseInt(parts[i+1], 10);
              }
              if (parts[i] === 'loss' && i+1 < parts.length) {
                window.lastMetrics.loss = parseInt(parts[i+1], 10);
              }
              if (parts[i] === 'fps' && i+1 < parts.length) {
                window.lastMetrics.fps = parseInt(parts[i+1], 10);
              }
            }
            
            // Estimate bytes received based on bandwidth
            window.lastMetrics.bytesReceived += (window.lastMetrics.bandwidth * 1000 / 8); 
          } catch (e) {
            // Silent error handling
          }
        }
        
        // Call original console.log
        return originalConsoleLog.apply(console, arguments);
      };
      
      // Add function to get stream info
      window.getStreamInfo = () => {
        const result = { 
          tracks: [],
          videoElements: []
        };
        
        // Check for active MediaStreamTracks
        if (window.peerConnection) {
          const receivers = window.peerConnection.getReceivers();
          if (receivers && receivers.length) {
            for (const receiver of receivers) {
              if (receiver.track) {
                const settings = receiver.track.getSettings();
                result.tracks.push({
                  kind: receiver.track.kind,
                  id: receiver.track.id,
                  settings: settings,
                  enabled: receiver.track.enabled,
                  muted: receiver.track.muted
                });
              }
            }
          }
        }
        
        // Also check video elements
        const videos = document.querySelectorAll('video');
        for (const video of videos) {
          const info = {
            id: video.id,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            hasStream: !!video.srcObject
          };
          
          // If it has a stream, get tracks
          if (video.srcObject) {
            info.streamTracks = video.srcObject.getTracks().map(t => ({
              kind: t.kind,
              id: t.id,
              enabled: t.enabled
            }));
          }
          
          result.videoElements.push(info);
        }
        
        return result;
      };
    }).catch(error => {
      console.warn(`Warning: Could not inject helper script: ${error.message}`);
    });
    
    // Give the page some more time to initialize
    await page.waitForTimeout(3000);
    
    // Wait for connection before starting duration timer
    console.log('Waiting for peer connection before starting duration timer...');
    const connected = await waitForConnection(page, connectionTimeout);
    
    if (connected) {
      // Mark connection start time
      connectionStartTime = Date.now();
      
      // Setup data reporting
      const statsInterval = setInterval(async () => {
        try {
          const stats = await getConnectionStats(page);
          let videoInfo;
          try {
            videoInfo = await getVideoElementInfo(page);
          } catch (e) {
            videoInfo = { renderedWidth: 0, renderedHeight: 0 };
          }
          
          const elapsedTime = Math.floor((Date.now() - connectionStartTime) / 1000);
          
          // Calculate data rate since last report
          const bytesSentSinceLast = Math.max(0, stats.bytesSent - lastBytesSent);
          const bytesReceivedSinceLast = Math.max(0, stats.bytesReceived - lastBytesReceived);
          
          // Update last values for next calculation
          lastBytesSent = stats.bytesSent || 0;
          lastBytesReceived = stats.bytesReceived || 0;
          
          // Format bytes with fallback for NaN values
          const totalSent = isNaN(stats.bytesSent) ? "0 Bytes" : formatBytes(stats.bytesSent);
          const totalReceived = isNaN(stats.bytesReceived) ? "0 Bytes" : formatBytes(stats.bytesReceived);
          const sentRate = isNaN(bytesSentSinceLast) ? "0 Bytes/s" : 
            formatBytes(bytesSentSinceLast / (reportInterval / 1000)) + '/s';
          const receivedRate = isNaN(bytesReceivedSinceLast) ? "0 Bytes/s" : 
            formatBytes(bytesReceivedSinceLast / (reportInterval / 1000)) + '/s';
          
          // Create report entry
          const reportEntry = {
            timestamp: stats.timestamp,
            elapsedSeconds: elapsedTime,
            stats: {
              ...stats,
              dataSentRate: sentRate,
              dataReceivedRate: receivedRate,
              totalSent: totalSent,
              totalReceived: totalReceived
            },
            videoInfo
          };
          
          // Add to report data array
          reportData.push(reportEntry);
          
          // Get stream information directly
          try {
            const streamInfo = await page.evaluate(() => {
              return window.getStreamInfo ? window.getStreamInfo() : null;
            });
            
            let videoWidth = 0;
            let videoHeight = 0;
            
            // Try to get resolution from MediaStreamTrack settings first
            if (streamInfo && streamInfo.tracks) {
              const videoTracks = streamInfo.tracks.filter(t => t.kind === 'video');
              if (videoTracks.length > 0) {
                for (const track of videoTracks) {
                  if (track.settings && track.settings.width && track.settings.height) {
                    videoWidth = track.settings.width;
                    videoHeight = track.settings.height;
                    console.log(`[Debug] Got resolution from track settings: ${videoWidth}x${videoHeight}`);
                    break;
                  }
                }
              }
            }
            
            // If we still don't have resolution, try video elements
            if (videoWidth === 0 || videoHeight === 0) {
              if (streamInfo && streamInfo.videoElements) {
                for (const video of streamInfo.videoElements) {
                  if (video.videoWidth > 0 && video.videoHeight > 0) {
                    videoWidth = video.videoWidth;
                    videoHeight = video.videoHeight;
                    console.log(`[Debug] Got resolution from video element: ${videoWidth}x${videoHeight}`);
                    break;
                  }
                }
              }
            }
            
            // Get resolution from lastMetrics as last resort
            if (videoWidth === 0 || videoHeight === 0) {
              const metrics = await page.evaluate(() => window.lastMetrics);
              if (metrics && metrics.width > 0 && metrics.height > 0) {
                videoWidth = metrics.width;
                videoHeight = metrics.height;
                console.log(`[Debug] Got resolution from lastMetrics: ${videoWidth}x${videoHeight}`);
              }
            }
            
            // Debug output
            if (videoWidth === 0 || videoHeight === 0) {
              if (streamInfo) {
                if (streamInfo.tracks.length > 0) {
                  console.log(`\n[Debug] Found ${streamInfo.tracks.length} media tracks:`);
                  streamInfo.tracks.forEach((t, i) => {
                    console.log(`  - Track ${i+1}: ${t.kind}, enabled: ${t.enabled}, muted: ${t.muted}`);
                    if (t.settings) {
                      console.log(`    Settings: ${JSON.stringify(t.settings)}`);
                    }
                  });
                }
                
                if (streamInfo.videoElements.length > 0) {
                  console.log(`\n[Debug] Found ${streamInfo.videoElements.length} video elements:`);
                  streamInfo.videoElements.forEach((v, i) => {
                    console.log(`  - Video ${i+1} (${v.id}): ${v.videoWidth}x${v.videoHeight}, has stream: ${v.hasStream}`);
                    if (v.streamTracks) {
                      console.log(`    Stream tracks: ${v.streamTracks.length} (${v.streamTracks.map(t => t.kind).join(', ')})`);
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.log(`[Debug] Error getting stream info: ${e.message}`);
          }
          
          // Log report to console
          console.log(`\n[${getTimestamp()}] Connection Stats (${elapsedTime}s):`);
          console.log('Data Transfer:');
          console.log(`  - Received: ${totalReceived} (${receivedRate})`);
          console.log(`  - Sent: ${totalSent} (${sentRate})`);
          
          if (stats.packetsReceived !== undefined || stats.packetsSent !== undefined) {
            const packetsReceived = stats.packetsReceived !== undefined ? stats.packetsReceived : 'N/A';
            const packetsSent = stats.packetsSent !== undefined ? stats.packetsSent : 'N/A';
            console.log(`  - Packets: ${packetsReceived} received, ${packetsSent} sent`);
          }
          
          if (stats.packetLossPercentage) {
            console.log(`  - Packet Loss: ${stats.packetLossPercentage}%`);
          }

          let videoWidth = 0;
          let videoHeight = 0;
          
          console.log('Video Quality:');
          // If we have automation metrics for FPS, use that
          if (stats.framerate) {
            const fps = typeof stats.framerate === 'number' ? stats.framerate.toFixed(1) : stats.framerate;
            console.log(`  - Framerate: ${fps} fps`);
          }
          
          // Use video resolution from all our sources
          if (videoWidth > 0 && videoHeight > 0) {
            console.log(`  - Resolution: ${videoWidth}x${videoHeight}`);
          } else {
            console.log(`  - Resolution: unknown (checking...)`);
            // Try to actively find video elements and query them
            try {
              const allVideos = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('video')).map(v => ({
                  width: v.videoWidth,
                  height: v.videoHeight,
                  visible: v.style.display !== 'none' && v.style.visibility !== 'hidden'
                }));
              });
              
              if (allVideos.length > 0) {
                console.log(`  - Found ${allVideos.length} video elements:`);
                allVideos.forEach((v, i) => {
                  console.log(`    Video ${i+1}: ${v.width}x${v.height} (${v.visible ? 'visible' : 'hidden'})`);
                });
              }
            } catch (e) {
              // Silent fail
            }
          }
          
          // Log rendered dimensions if available
          if (videoInfo?.renderedWidth && videoInfo?.renderedHeight) {
            console.log(`  - Rendered: ${videoInfo.renderedWidth}x${videoInfo.renderedHeight}`);
          }
          
          console.log('Network:');
          // If we have automation metrics for bandwidth, use that
          if (stats.bandwidth?.incoming) {
            console.log(`  - Incoming Bandwidth: ${stats.bandwidth.incoming} kbps`);
          }
          
          if (stats.bandwidth?.outgoing) {
            console.log(`  - Outgoing Bandwidth: ${stats.bandwidth.outgoing} kbps`);
          }
          
          // If we have automation metrics for RTT, use that
          if (stats.roundTripTime) {
            // Convert to ms if it's in seconds
            const rtt = stats.roundTripTime > 1 ? 
              stats.roundTripTime.toFixed(0) : 
              (stats.roundTripTime * 1000).toFixed(2);
            console.log(`  - Round Trip Time: ${rtt} ms`);
          }
          
        } catch (error) {
          console.error('Error getting stats:', error);
        }
      }, reportInterval);
      
      // Set up duration timer if specified and connected
      if (options.duration > 0) {
        console.log(`\nConnection established! Receiver will run for ${options.duration} seconds. You can also press Ctrl+C to stop earlier.\n`);
        setTimeout(() => {
          clearInterval(statsInterval);
          console.log(`Reached specified duration of ${options.duration} seconds after connection.`);
          shutdownReceiver(browser, reportData);
        }, options.duration * 1000);
      } else {
        console.log('\nReceiver is running. Press Ctrl+C to stop.\n');
      }
      
    } else if (!connected && options.duration > 0) {
      console.log('\nNo connection established within the timeout period. Keeping receiver running until Ctrl+C.\n');
    } else {
      console.log('\nReceiver is running. Press Ctrl+C to stop.\n');
    }
    
    // Setup clean exit
    process.on('SIGINT', async () => {
      await shutdownReceiver(browser, reportData);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the receiver
runReceiver().catch(console.error);