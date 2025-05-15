// sender.js - WebRTC Sender for performance testing with congestion control options
// Enhanced with headless support
const puppeteer = require('puppeteer');
const { program } = require('commander');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

// Command line options
program
  .option('-s, --server <url>', 'Server URL', 'http://localhost:4000')
  .option('-i, --id <id>', 'Sender ID', 'sender-client')
  .option('-v, --video <filename>', 'Path to local video file to stream')
  .option('--chrome-path <path>', 'Custom path to Chrome executable')
  .option('--cc <algorithm>', 'Congestion control algorithm (gcc or bbr)', 'gcc')
  .option('--rtc-internals', 'Open chrome://webrtc-internals in a separate tab', false)
  .option('--stats-file <filename>', 'File to save detailed statistics', 'sender-stats.json')
  .option('--stats-interval <seconds>', 'Interval for collecting stats in seconds', 5)
  .option('--metrics-interval <ms>', 'Interval for fine-grained metrics in milliseconds', 1000)
  .option('--duration <seconds>', 'Duration to run the sender in seconds (0 for unlimited)', 0)
  .option('--debug', 'Enable debug mode', false)
  .option('--headless <boolean>', 'Run in headless mode', true)
  .parse(process.argv);

const options = program.opts();

// Initialize stats storage
const stats = {
  timestamp: Date.now(),
  senderId: options.id,
  video: options.video,
  congestionControl: options.cc,
  samples: [],
  rawMetrics: [] // For fine-grained metrics
};

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

// Helper function to calculate standard deviation
function calculateStdDev(values) {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

// Get congestion control args
function getCongestionControlArgs() {
  const ccArgs = [];
  
  if (options.cc.toLowerCase() === 'bbr') {
    console.log("Using BBR congestion control");
    ccArgs.push(
      '--force-fieldtrials=WebRTC-PacingExperiment/Enabled/',
      '--force-fieldtrial-params=WebRTC-PacingExperiment.Enabled/congestion_controller:bbr',
      '--enable-bwe-measurement-framework'
    );
  } else {
    console.log("Using GCC congestion control (default)");
  }
  
  // Add detailed WebRTC logging
  if (options.debug) {
    ccArgs.push(
      '--enable-logging',
      '--log-level=0',
      '--vmodule=*/webrtc/*=3,*/call/*=3,*/rtp/*=3,*/transport/*=3',
      '--force-fieldtrials=WebRTC-RtcEventLog/Enabled/'
    );
  }
  
  return ccArgs;
}

// Collect detailed WebRTC stats
async function collectDetailedStats(page) {
  try {
    return await page.evaluate(() => {
      return new Promise(async (resolve) => {
        try {
          // Get connection from the page - this assumes the connection is stored in a global variable
          // You might need to adjust this based on how your WebRTC app stores the connection
          const connections = [];
          
          // Try to find RTCPeerConnection objects
          if (window.peerConnections) {
            for (const peerId in window.peerConnections) {
              const pc = window.peerConnections[peerId].connection;
              if (pc && pc.getStats) {
                connections.push({ peerId, pc });
              }
            }
          }
          
          // If no connections found but we have a global peerConnection, use that
          if (connections.length === 0 && window.peerConnection && window.peerConnection.getStats) {
            connections.push({ peerId: 'main', pc: window.peerConnection });
          }
          
          if (connections.length === 0) {
            return resolve({ error: 'No active peer connections found' });
          }
          
          // Get stats for all connections
          const allStats = {};
          
          for (const { peerId, pc } of connections) {
            const rawStats = await pc.getStats();
            const peerStats = { timestamp: Date.now(), metrics: {} };
            
            // Process stats data
            rawStats.forEach(report => {
              // Basic connection stats
              if (report.type === 'transport') {
                peerStats.metrics.transport = {
                  bytesReceived: report.bytesReceived,
                  bytesSent: report.bytesSent,
                  selectedCandidatePairChanges: report.selectedCandidatePairChanges,
                  dtlsState: report.dtlsState
                };
              }
              
              // Candidate pair stats (network related)
              if (report.type === 'candidate-pair' && report.selected) {
                peerStats.metrics.candidatePair = {
                  availableOutgoingBitrate: report.availableOutgoingBitrate,
                  availableIncomingBitrate: report.availableIncomingBitrate,
                  currentRoundTripTime: report.currentRoundTripTime,
                  priority: report.priority,
                  nominated: report.nominated,
                  writable: report.writable
                };
              }
              
              // Outbound RTP (sending)
              if (report.type === 'outbound-rtp' && report.kind === 'video') {
                peerStats.metrics.outboundVideo = {
                  bytesSent: report.bytesSent,
                  packetsSent: report.packetsSent,
                  framesSent: report.framesSent,
                  framesEncoded: report.framesEncoded,
                  framesPerSecond: report.framesPerSecond,
                  qualityLimitationReason: report.qualityLimitationReason,
                  qualityLimitationResolutionChanges: report.qualityLimitationResolutionChanges,
                  encoderImplementation: report.encoderImplementation,
                  retransmittedPacketsSent: report.retransmittedPacketsSent,
                  totalEncodeTime: report.totalEncodeTime,
                  rid: report.rid
                };

                // Add codec information if available
                if (report.codecId) {
                  const codecStats = rawStats.get(report.codecId);
                  if (codecStats) {
                    peerStats.metrics.outboundVideo.codec = {
                      mimeType: codecStats.mimeType,
                      clockRate: codecStats.clockRate,
                      channels: codecStats.channels
                    };
                  }
                }
              }
              
              // Inbound RTP (receiving)
              if (report.type === 'inbound-rtp' && report.kind === 'video') {
                peerStats.metrics.inboundVideo = {
                  bytesReceived: report.bytesReceived,
                  packetsReceived: report.packetsReceived,
                  packetsLost: report.packetsLost,
                  framesReceived: report.framesReceived,
                  framesDecoded: report.framesDecoded,
                  framesPerSecond: report.framesPerSecond,
                  jitterBufferDelay: report.jitterBufferDelay,
                  jitter: report.jitter,
                  rid: report.rid
                };
              }
              
              // Get audio stats too
              if (report.type === 'outbound-rtp' && report.kind === 'audio') {
                peerStats.metrics.outboundAudio = {
                  bytesSent: report.bytesSent,
                  packetsSent: report.packetsSent
                };
              }
              
              if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                peerStats.metrics.inboundAudio = {
                  bytesReceived: report.bytesReceived,
                  packetsReceived: report.packetsReceived,
                  packetsLost: report.packetsLost,
                  jitter: report.jitter
                };
              }
            });
            
            // Try to extract BWE info (congestion control specific)
            const bweKeys = Array.from(rawStats.keys())
              .filter(key => rawStats.get(key).type === 'bwe' || key.includes('bwe'));
            
            if (bweKeys.length > 0) {
              const bweReport = rawStats.get(bweKeys[0]);
              if (bweReport) {
                peerStats.metrics.bandwidthEstimation = {
                  targetEncBitrate: bweReport.targetEncBitrate,
                  actualEncBitrate: bweReport.actualEncBitrate,
                  transmitBitrate: bweReport.transmitBitrate,
                  algorithm: bweReport.algorithm || window.options?.cc // Use the algorithm name if available
                };
              }
            }
            
            // Add stats for this peer to the collection
            allStats[peerId] = peerStats;
          }
          
          // Add additional UI metrics if available (in headless mode, we might not have these)
          try {
            const bandwidth = document.getElementById('bandwidth');
            const rtt = document.getElementById('rtt');
            const packetLoss = document.getElementById('packetLoss');
            const frameRate = document.getElementById('frameRate');
            const peerCount = document.getElementById('peerCount');
            
            if (bandwidth && rtt && packetLoss && frameRate && peerCount) {
              allStats.ui = {
                bandwidth: parseFloat(bandwidth.textContent.replace(' kbps', '')) || 0,
                rtt: parseFloat(rtt.textContent.replace(' ms', '')) || 0,
                packetLoss: parseFloat(packetLoss.textContent.replace('%', '')) || 0,
                frameRate: parseFloat(frameRate.textContent.replace(' fps', '')) || 0,
                peerCount: parseInt(peerCount.textContent) || 0
              };
            } else {
              // Fallback when UI elements aren't available or accessible
              allStats.ui = {
                bandwidth: 0,
                rtt: 0,
                packetLoss: 0,
                frameRate: 0,
                peerCount: connections.length
              };
            }
          } catch (uiError) {
            allStats.ui = { 
              error: uiError.toString(),
              peerCount: connections.length // At least provide peer count
            };
          }
          
          resolve(allStats);
        } catch (error) {
          resolve({ error: error.toString() });
        }
      });
    });
  } catch (error) {
    console.log('Error collecting page stats:', error.message);
    return { error: error.message, timestamp: Date.now() };
  }
}

// Wait for connection to be established
async function waitForConnection(page, maxWaitTime = 60000) { // Increased timeout for potential network issues
  console.log('Waiting for peer connection...');
  
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    // Set up a checker function that will run periodically
    const connectionCheckInterval = setInterval(async () => {
      // Check if time exceeded
      if (Date.now() - startTime > maxWaitTime) {
        clearInterval(connectionCheckInterval);
        console.log('Connection timeout - no peers connected within the allowed time.');
        resolve(true); // Return true anyway to continue the test - useful for debugging
        return;
      }
      
      try {
        // Method 1: Check peer count
        const peerCount = await page.evaluate(() => {
          return parseInt(document.getElementById('peerCount')?.textContent) || 0;
        }).catch(() => 0);
        
        if (peerCount > 0) {
          clearInterval(connectionCheckInterval);
          console.log(`Connection established! Peer count: ${peerCount}`);
          resolve(true);
          return;
        }
        
        // Method 2: Check for peerConnections object
        const hasPeerConnections = await page.evaluate(() => {
          return window.peerConnections && Object.keys(window.peerConnections).length > 0;
        }).catch(() => false);
        
        if (hasPeerConnections) {
          clearInterval(connectionCheckInterval);
          console.log(`Connection established! (detected from peerConnections object)`);
          resolve(true);
          return;
        }
        
        // Method 3: Check if we have a global peerConnection
        const hasGlobalPeerConnection = await page.evaluate(() => {
          return !!window.peerConnection;
        }).catch(() => false);
        
        if (hasGlobalPeerConnection) {
          clearInterval(connectionCheckInterval);
          console.log(`Connection established! (detected from global peerConnection)`);
          resolve(true);
          return;
        }
        
        // Log progress every 10 seconds
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        if (elapsedSeconds % 10 === 0 && elapsedSeconds > 0) {
          console.log(`Still waiting for connection... (${elapsedSeconds}s elapsed)`);
        }
      } catch (error) {
        console.log(`Error checking connection: ${error.message}`);
      }
    }, 2000);
    
    // Also set up a direct listener for the peer-connected automation event
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Automation] peer-connected') || 
          text.includes('[Automation] sent-offer') ||
          text.includes('[Automation] connection established')) {
        clearInterval(connectionCheckInterval);
        console.log('Connection established! (detected from automation event)');
        resolve(true);
      }
    });
  });
}

// Gracefully shutdown the sender
async function shutdownSender(browser, statsInterval) {
  console.log('Shutting down sender gracefully...');
  
  // Clear the stats collection interval
  clearInterval(statsInterval);
  
  // Save final stats
  try {
    await fs.writeFile(
      path.resolve(options.statsFile), 
      JSON.stringify(stats, null, 2)
    );
    console.log(`Stats saved to ${options.statsFile}`);
  } catch (error) {
    console.error(`Error saving stats: ${error.message}`);
  }
  
  // Close browser
  await browser.close();
  console.log('Sender stopped successfully.');
  process.exit(0);
}

// Main function
async function runSender() {
  console.log(`Starting WebRTC sender on ${options.server}`);
  console.log(`Sender ID: ${options.id}`);
  
  if (options.video) {
    console.log(`Video file: ${options.video}`);
    
    // Check if file exists before proceeding
    try {
      await fs.access(options.video);
    } catch (error) {
      console.error(`Error: Video file not found at ${options.video}`);
      process.exit(1);
    }
  } else {
    console.log('No video file specified. Will use webcam.');
  }
  
  console.log(`Congestion Control: ${options.cc}`);
  
  if (options.duration > 0) {
    console.log(`Test duration: ${options.duration} seconds`);
  } else {
    console.log('Test duration: Unlimited (run until manually stopped)');
  }
  
  console.log(`Stats collection interval: ${options.statsInterval} seconds`);
  console.log(`Fine-grained metrics interval: ${options.metricsInterval || 1000} ms`);
  
  const chromePath = getChromePath();
  const ccArgs = getCongestionControlArgs();
  const headless = options.headless === 'false' ? false : true;
  
  console.log(`Running in ${headless ? 'headless' : 'visible'} mode`);
  
  try {
    // Create a unique profile directory to avoid session restore prompts
    const userDataDir = `./chrome_profile_sender_${Date.now()}`;
    
    // Launch browser
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: headless ? 'new' : false, // Use 'new' for newer versions of Puppeteer
      executablePath: chromePath,
      userDataDir: userDataDir,
      ignoreHTTPSErrors: true,
      slowMo: options.debug ? 50 : 0, // slow down operations in debug mode
      args: [
        '--allow-file-access',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Overcome limited resource problems
        '--disable-web-security',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--allow-file-access-from-files',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-session-crashed-bubble',
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
        '--mute-audio',
        ...ccArgs
      ]
    });
     
    // Create page
    const page = await browser.newPage();
    
    // Setup console logging
    page.on('console', msg => console.log(`[PAGE] ${msg.text()}`));
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));
    
    // Monitor 404 responses
    page.on('response', response => {
      if (response.status() === 404) {
        console.log(`[404] Resource not found: ${response.url()}`);
      }
    });
    
    // Set longer timeout for resource loading
    page.setDefaultNavigationTimeout(120000);
    
    // Open WebRTC internals if requested and not in headless mode
    if (options.rtcInternals && !headless) {
      console.log('Opening WebRTC internals...');
      const rtcInternalsPage = await browser.newPage();
      await rtcInternalsPage.goto('chrome://webrtc-internals');
    }
    
    // Set up listener for console logs to capture metrics
    page.on('console', msg => {
      const text = msg.text();
      
      // Capture metrics updates
      if (text.includes('metrics-updated-bandwidth')) {
        try {
          // Extract the metrics using regex for more reliable parsing
          const bwMatch = text.match(/bandwidth-(\d+)/);
          const rttMatch = text.match(/rtt-(\d+)/);
          const lossMatch = text.match(/loss-(\d+)/);
          const fpsMatch = text.match(/fps-(\d+)/);
          
          if (bwMatch && rttMatch && lossMatch && fpsMatch) {
            const timestamp = new Date();
            const formattedTime = timestamp.toISOString();
            const metric = {
              timestamp: timestamp.getTime(),
              bandwidth: parseInt(bwMatch[1], 10),
              rtt: parseInt(rttMatch[1], 10),
              loss: parseInt(lossMatch[1], 10),
              fps: parseInt(fpsMatch[1], 10)
            };
            
            // Add more detailed logging with timestamp
            console.log(`[METRIC][${formattedTime}] BW: ${metric.bandwidth} kbps, RTT: ${metric.rtt} ms, Loss: ${metric.loss}%, FPS: ${metric.fps}`);
            
            // Store in our raw metrics array
            stats.rawMetrics.push(metric);
          }
        } catch (error) {
          console.log(`[METRIC PARSE ERROR] ${error.message}`);
        }
      }
    });

    // Navigate to the application
    const metricsInterval = options.metricsInterval || 1000;
    const url = `${options.server}?id=${options.id}&role=sender&metricsInterval=${metricsInterval}&autostart=true`;
    console.log(`Navigating to: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
      console.log('Page loaded successfully');
    } catch (error) {
      console.warn(`Warning: Navigation completed with issue: ${error.message}`);
      console.log('Continuing anyway as the application may still function correctly...');
      
      // Give some time for the page to load as much as possible
      await page.waitForTimeout(5000);
    }
    
    // Store PeerConnection globally to make it easier to access in headless mode
    await page.evaluate(() => {
      // Store original RTCPeerConnection constructor
      const originalRTCPeerConnection = window.RTCPeerConnection;
      
      window.RTCPeerConnection = function() {
        // Create the peer connection using the original constructor
        const pc = new originalRTCPeerConnection(...arguments);
        
        // Store it globally for easier access
        window.peerConnection = pc;
        
        // Return the peer connection
        return pc;
      };
      
      // Make peerConnections globally available
      window.peerConnections = window.peerConnections || {};
    });
    
    // Set video source to file if a video is specified
    if (options.video) {
      console.log('Setting video source to file...');
      try {
        // Select file as the source
        await page.select('#videoSource', 'file').catch(e => console.warn(`Warning: Could not select video source: ${e.message}`));
        
        // Wait for the file input to be visible
        await page.waitForSelector('#localFileInput', { timeout: 5000 }).catch(e => console.warn(`Warning: localFileInput selector not found: ${e.message}`));
        
        // Upload the video file
        console.log(`Uploading video file: ${options.video}`);
        const inputElement = await page.$('#localFileInput');
        if (inputElement) {
          await inputElement.uploadFile(options.video);
          console.log('File uploaded successfully');
        } else {
          console.warn('Warning: Could not find the file input element. Manual upload may be required in visible mode.');
        }
        
        // Give a moment for the file to be processed
        await page.waitForTimeout(2000);
      } catch (error) {
        console.warn(`Warning during video setup: ${error.message}`);
      }
    }
    
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
    
    // Wait for connection
    const connected = await waitForConnection(page);
    if (!connected) {
      console.log('Failed to establish a connection. Continuing anyway...');
    }
    
    // Run test, collecting stats
    console.log('Sender ready - collecting metrics...');
    
    // Set up stats collection interval
    let runTime = 0;
    const statsIntervalMs = options.statsInterval * 1000;
    
    const statsInterval = setInterval(async () => {
      runTime += options.statsInterval;
      
      try {
        const detailedStats = await collectDetailedStats(page);
        console.log(`[${runTime}s] Connection stats collected`);
        
        if (options.debug) {
          console.log(JSON.stringify(detailedStats, null, 2));
        }
        
        // Add to our stats collection
        const sample = {
          timestamp: Date.now(),
          elapsedSeconds: runTime,
          ...detailedStats
        };
        
        // Add derived metrics if available
        if (stats.rawMetrics.length > 0) {
          // Get statistics from raw metrics since last sample
          const lastSampleTime = stats.samples.length > 0 ? 
            stats.samples[stats.samples.length - 1].timestamp : 
            stats.timestamp;
            
          const relevantMetrics = stats.rawMetrics.filter(m => m.timestamp > lastSampleTime);
          
          if (relevantMetrics.length > 0) {
            // Calculate averages, min, max, etc.
            sample.derivedMetrics = {
              bandwidth: {
                avg: relevantMetrics.reduce((sum, m) => sum + m.bandwidth, 0) / relevantMetrics.length,
                min: Math.min(...relevantMetrics.map(m => m.bandwidth)),
                max: Math.max(...relevantMetrics.map(m => m.bandwidth)),
                stdDev: calculateStdDev(relevantMetrics.map(m => m.bandwidth))
              },
              rtt: {
                avg: relevantMetrics.reduce((sum, m) => sum + m.rtt, 0) / relevantMetrics.length,
                min: Math.min(...relevantMetrics.map(m => m.rtt)),
                max: Math.max(...relevantMetrics.map(m => m.rtt))
              },
              loss: {
                avg: relevantMetrics.reduce((sum, m) => sum + m.loss, 0) / relevantMetrics.length,
                max: Math.max(...relevantMetrics.map(m => m.loss))
              },
              fps: {
                avg: relevantMetrics.reduce((sum, m) => sum + m.fps, 0) / relevantMetrics.length
              },
              count: relevantMetrics.length
            };
            
            // Log the derived metrics
            console.log('---- DETAILED METRICS SUMMARY ----');
            console.log(`Bandwidth: Avg=${sample.derivedMetrics.bandwidth.avg.toFixed(2)} kbps, Min=${sample.derivedMetrics.bandwidth.min} kbps, Max=${sample.derivedMetrics.bandwidth.max} kbps`);
            console.log(`RTT: Avg=${sample.derivedMetrics.rtt.avg.toFixed(2)} ms, Min=${sample.derivedMetrics.rtt.min} ms, Max=${sample.derivedMetrics.rtt.max} ms`);
            console.log(`Packet Loss: Avg=${sample.derivedMetrics.loss.avg.toFixed(2)}%, Max=${sample.derivedMetrics.loss.max}%`);
            console.log(`Frame Rate: Avg=${sample.derivedMetrics.fps.avg.toFixed(2)} fps`);
            console.log(`Metrics count: ${sample.derivedMetrics.count}`);
            console.log('----------------------------------');
          }
        }
        
        stats.samples.push(sample);
        
        // Write updated stats to file
        try {
          await fs.writeFile(
            path.resolve(options.statsFile), 
            JSON.stringify(stats, null, 2)
          );
        } catch (fileError) {
          console.warn(`Warning: Could not write stats to file: ${fileError.message}`);
        }
        
        // Check if we've reached the specified duration
        if (options.duration > 0 && runTime >= options.duration) {
          console.log(`Reached specified duration of ${options.duration} seconds.`);
          await shutdownSender(browser, statsInterval);
        }
      } catch (error) {
        console.error('Error collecting stats:', error);
      }
    }, statsIntervalMs);
    
    // Setup message based on duration
    if (options.duration > 0) {
      console.log(`\nSender is running for ${options.duration} seconds. You can also press Ctrl+C to stop earlier.\n`);
    } else {
      console.log('\nSender is running. Press Ctrl+C to stop.\n');
    }
    
    // Setup clean exit
    process.on('SIGINT', async () => {
      await shutdownSender(browser, statsInterval);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the sender
runSender().catch(console.error);