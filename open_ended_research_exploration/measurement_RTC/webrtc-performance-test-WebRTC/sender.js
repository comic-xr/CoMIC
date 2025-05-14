// sender.js - WebRTC Sender for performance testing with congestion control options
const puppeteer = require('puppeteer');
const { program } = require('commander');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

// Command line options
program
  .option('-s, --server <url>', 'Server URL', 'http://localhost:4000')
  .option('-i, --id <id>', 'Sender ID', 'sender-client')
  .option('-v, --video <filename>', 'Path to local video file to stream',false)
  .option('--chrome-path <path>', 'Custom path to Chrome executable')
  .option('--cc <algorithm>', 'Congestion control algorithm (gcc or bbr)', 'gcc')
  .option('--rtc-internals', 'Open chrome://webrtc-internals in a separate tab', false)
  .option('--stats-file <filename>', 'File to save detailed statistics', 'sender-stats.json')
  .option('--stats-interval <seconds>', 'Interval for collecting stats in seconds', 5)
  .option('--metrics-interval <ms>', 'Interval for fine-grained metrics in milliseconds', 1000)
  .option('--duration <seconds>', 'Duration to run the sender in seconds (0 for unlimited)', 0)
  .option('--debug', 'Enable debug mode', false)
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
          for (const peerId in window.peerConnections) {
            const pc = window.peerConnections[peerId].connection;
            if (pc && pc.getStats) {
              connections.push({ peerId, pc });
            }
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
          
          // Add additional UI metrics
          try {
            allStats.ui = {
              bandwidth: parseFloat(document.getElementById('bandwidth').textContent.replace(' kbps', '')),
              rtt: parseFloat(document.getElementById('rtt').textContent.replace(' ms', '')),
              packetLoss: parseFloat(document.getElementById('packetLoss').textContent.replace('%', '')),
              frameRate: parseFloat(document.getElementById('frameRate').textContent.replace(' fps', '')),
              peerCount: parseInt(document.getElementById('peerCount').textContent)
            };
          } catch (uiError) {
            allStats.ui = { error: uiError.toString() };
          }
          
          // Look for more advanced stats
          try {
            // Check for congestion window info
            const statsContainer = document.querySelector('.advanced-stats');
            if (statsContainer) {
              allStats.advancedStats = {};
              const statElements = statsContainer.querySelectorAll('.stat-item');
              statElements.forEach(el => {
                const key = el.querySelector('.stat-name')?.textContent;
                const value = el.querySelector('.stat-value')?.textContent;
                if (key && value) {
                  allStats.advancedStats[key.trim()] = value.trim();
                }
              });
            }
          } catch (advError) {
            // Ignore advanced stats errors
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
async function waitForConnection(page, maxWaitTime = 30000) { // Reduced timeout for testing
  console.log('Waiting for peer connection...');
  
  const startTime = Date.now();
  let connected = false;
  
  while (!connected && (Date.now() - startTime) < maxWaitTime) {
    // Check peer count
    const peerCount = await page.evaluate(() => {
      return parseInt(document.getElementById('peerCount').textContent) || 0;
    });
    
    if (peerCount > 0) {
      connected = true;
      console.log(`Connection established! Peer count: ${peerCount}`);
    } else {
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Log progress
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      if (elapsedSeconds % 10 === 0) {
        console.log(`Still waiting for connection... (${elapsedSeconds}s elapsed)`);
      }
    }
  }
  
  if (!connected) {
    console.log('Connection timeout - no peers connected. Will continue anyway for testing purposes.');
    return true; // Return true to continue the test even without peers
  }
  
  return true;
}

// Gracefully shutdown the sender
async function shutdownSender(browser, statsInterval) {
  console.log('Shutting down sender gracefully...');
  
  // Clear the stats collection interval
  clearInterval(statsInterval);
  
  // Save final stats
  await fs.writeFile(
    path.resolve(options.statsFile), 
    JSON.stringify(stats, null, 2)
  );
  
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
  
  try {
    // Launch browser
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: chromePath,
      userDataDir: './chrome_test_profile',
      slowMo: options.debug ? 50 : 0, // slow down operations in debug mode
      args: [
        '--allow-file-access',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--allow-file-access-from-files',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-session-crashed-bubble',
        '--incognito',
        '--window-size=1920,1080',
        '--disable-notifications',
        '--disable-geolocation',
        '--disable-permissions-api',
        ...ccArgs
      ]
    });


        // args: [
        //   '--no-sandbox',
        //   '--disable-setuid-sandbox',
        //   '--disable-web-security',
        //   '--disable-cache',
          
        //   '--disable-brave-update',
        //   '--disable-component-update',
        //   '--disable-sync',
        //   '--disable-brave-rewards',
        //   '--disable-quic'
        // ]
     
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
    page.setDefaultNavigationTimeout(60000);
    
    // Open WebRTC internals if requested
    if (options.rtcInternals) {
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
    const url = `${options.server}?id=${options.id}&role=sender&metricsInterval=${metricsInterval}`;
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Set video source to file if a video is specified
    if (options.video) {
      console.log('Setting video source to file...');
      await page.select('#videoSource', 'file');
      
      // Wait for the file input to be visible
      await page.waitForSelector('#localFileInput', { visible: true });
      
      // Upload the video file
      console.log(`Uploading video file: ${options.video}`);
      const inputElement = await page.$('#localFileInput');
      await inputElement.uploadFile(options.video);
      
      console.log('File uploaded successfully');
      
      // Give a moment for the file to be processed
      await page.waitForTimeout(1000);
    }
    
    // Click the start button
    console.log('Clicking start button...');
    await page.click('#startBtn');
    
    // Expose the peerConnections variable from the page to our stats collection
    await page.evaluate(() => {
      // This assumes your WebRTC app stores connections in peerConnections
      window.peerConnections = window.peerConnections || {};
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
        await fs.writeFile(
          path.resolve(options.statsFile), 
          JSON.stringify(stats, null, 2)
        );
        
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