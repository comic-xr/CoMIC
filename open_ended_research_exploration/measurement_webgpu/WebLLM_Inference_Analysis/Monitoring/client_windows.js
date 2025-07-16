const puppeteer = require('puppeteer');
const fs = require('fs');
const os = require('os');
const http = require('http');
const url = require('url');
const { exec } = require('child_process');
const path = require('path');

// Path to your WebGL HTML file 
const WEBGL_URL = 'http://127.0.0.1:5500/';
const CONFIG = {
  modelName: "Llama-3.2-1B-Instruct-q4f32_1-MLC", 
 
  testPrompt: "What is the name of our galaxy?",
  
  // Timeouts (in milliseconds)
  timeouts: {
    modelLoading: 300000,      
    inference: 120000,         
    maxTotal: 180000,          // Total max time (3 min default)
    postLoadingSamples: 10    
  },
  

  sampleIntervalMs: 1000,    // Take metrics every 1 second
  outputFiles: {
    metrics: "webllm-metrics.json",
    visualization: "webllm-visualization.html"
  }
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function sampleGpuMetrics() {
  const timestamp = new Date().toISOString();
  const metrics = {
    timestamp,
    system: {},
    memory: {},
    gpu: {},
    cpu: {}
  };

  try {
   
    const commands = {
      system: 'Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer, Model, TotalPhysicalMemory',
      processor: 'Get-CimInstance Win32_Processor | Select-Object Name, LoadPercentage, NumberOfCores, NumberOfLogicalProcessors',
      gpu: 'Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM, DriverVersion',
      memory: 'Get-CimInstance Win32_OperatingSystem | Select-Object FreePhysicalMemory, TotalVisibleMemorySize'
    };
    const combinedCmd = Object.values(commands).map(cmd => cmd).join('; ');
    const fullOutput = await runCommand(`powershell -Command "${combinedCmd}"`);

    function parseOutput(output, delimiter = ':') {
      const lines = output.split('\n')
        .map(line => line.trim())
        .filter(line => line.includes(delimiter));
      
      return lines.reduce((acc, line) => {
        const [key, value] = line.split(delimiter).map(s => s.trim());
        acc[key] = value;
        return acc;
      }, {});
    }

    const systemInfo = parseOutput(fullOutput);

    metrics.system = {
      manufacturer: systemInfo['Manufacturer'] || 'Unknown',
      model: systemInfo['Model'] || 'Unknown',
      totalMemory: systemInfo['TotalPhysicalMemory'] 
        ? `${(parseInt(systemInfo['TotalPhysicalMemory']) / (1024 * 1024 * 1024)).toFixed(2)} GB` 
        : 'Unknown'
    };

    // Populate CPU metrics
    metrics.cpu = {
      model: systemInfo['Name'] || 'Unknown',
      load: systemInfo['LoadPercentage'] ? parseInt(systemInfo['LoadPercentage']) : 0,
      cores: systemInfo['NumberOfCores'] ? parseInt(systemInfo['NumberOfCores']) : 'Unknown',
      logicalProcessors: systemInfo['NumberOfLogicalProcessors'] ? parseInt(systemInfo['NumberOfLogicalProcessors']) : 'Unknown'
    };

    // Populate GPU metrics
    metrics.gpu = {
      model: systemInfo['Name'] || 'Unknown',
      vram: systemInfo['AdapterRAM'] 
        ? `${(parseInt(systemInfo['AdapterRAM']) / (1024 * 1024)).toFixed(2)} MB` 
        : 'Unknown',
      driverVersion: systemInfo['DriverVersion'] || 'Unknown'
    };

    // Populate memory metrics
    metrics.memory = {
      free: systemInfo['FreePhysicalMemory'] 
        ? (parseInt(systemInfo['FreePhysicalMemory']) / 1024).toFixed(2) + ' MB'
        : 'Unknown',
      total: systemInfo['TotalVisibleMemorySize'] 
        ? (parseInt(systemInfo['TotalVisibleMemorySize']) / 1024).toFixed(2) + ' MB'
        : 'Unknown'
    };

    return metrics;
  } catch (error) {
    console.error(`Error collecting system metrics: ${error.message}`);
    return { 
      timestamp, 
      error: error.message,
      system: { manufacturer: 'Unknown', model: 'Unknown' },
      memory: {},
      gpu: {},
      cpu: {}
    };
  }
}

// Main profiling function
async function profileWebLLM() {
  console.log('Starting WebLLM profiling on macOS...');
  console.log(`Config: Model=${CONFIG.modelName || 'Default'}, Sample interval=${CONFIG.sampleIntervalMs}ms`);
  
  // Launch browser
  const browser = await puppeteer.launch({
  headless: false,
  executablePath: 'C:\\Users\\nmehjabi\\.cache\\puppeteer\\chrome\\win64-136.0.7103.92\\chrome-win64\\chrome.exe', // Specify the correct path
  args: [
    '--enable-webgl',
    '--ignore-gpu-blacklist',
    '--enable-gpu-rasterization',
    '--disable-web-security',
    '--no-sandbox'
  ],
  defaultViewport: { width: 1200, height: 800 }
});

  const metrics = {
    samples: [],
    events: [],
    phases: {},
    config: CONFIG,
    system: null
  };
  
  const logEvent = (name, details = {}) => {
    const event = {
      timestamp: new Date().toISOString(),
      name,
      ...details
    };
    metrics.events.push(event);
    console.log(`[${new Date().toLocaleTimeString()}] ${name}`);
    return event;
  };
  
  const startPhase = (name) => {
    metrics.phases[name] = {
      start: new Date().toISOString(),
      samples: []
    };
    logEvent(`Phase started: ${name}`);
  };
  
  const endPhase = (name) => {
    if (metrics.phases[name]) {
      metrics.phases[name].end = new Date().toISOString();
      metrics.phases[name].duration = 
        new Date(metrics.phases[name].end) - new Date(metrics.phases[name].start);
      logEvent(`Phase completed: ${name}`, {
        durationMs: metrics.phases[name].duration
      });
    }
  };
  
  try {
    const page = await browser.newPage();
    
    // Set longer timeouts
    page.setDefaultNavigationTimeout(CONFIG.timeouts.maxTotal);
    page.setDefaultTimeout(CONFIG.timeouts.maxTotal);
    
    // Create client for CDP (Chrome DevTools Protocol)
    const client = await page.target().createCDPSession();
    await client.send('Performance.enable');
    
    logEvent('Navigation started');
    await page.goto(WEBGL_URL, { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => {
      logEvent('Navigation warning', { message: e.message });
    });
    logEvent('Page loaded');
 
    startPhase('overall');
    const metricCollectionTask = (async () => {
      const startTime = Date.now();
      const maxDuration = CONFIG.timeouts.maxTotal;
      
      while (Date.now() - startTime < maxDuration) {
        try {
          // Collect performance metrics
          const perfMetrics = await client.send('Performance.getMetrics');
          
          // Collect system metrics
          const macMetrics = await sampleGpuMetrics();
      
          const webLLMStatus = await page.evaluate(() => {
            const elements = {
              downloadStatus: document.querySelector('#download-status')?.textContent || '',
              promptInput: document.querySelector('#prompt-input')?.value || '',
              outputArea: document.querySelector('#output-area')?.textContent || '',
              inferenceStatus: document.querySelector('#inference-status')?.textContent || ''
            };
         
            let state = 'unknown';
            if (elements.downloadStatus.includes('Finish loading')) {
              state = 'model_loaded';
            } else if (elements.downloadStatus.includes('Downloading')) {
              state = 'downloading';
            } else if (elements.inferenceStatus.includes('Generating')) {
              state = 'generating';
            } else if (elements.inferenceStatus.includes('Complete')) {
              state = 'complete';
            }
            
            return {
              elements,
              state,
              timestamp: new Date().toISOString()
            };
          }).catch(e => ({ state: 'error', error: e.message }));
          
          // Measure FPS (sample over 1 second)
          let fpsData;
          try {
            fpsData = await page.evaluate(() => {
              return new Promise(resolve => {
                let frameCount = 0;
                const startTime = performance.now();
                function checkFPS() {
                  frameCount++;
                  const elapsed = performance.now() - startTime;
                  if (elapsed >= 1000) {
                    resolve({ fps: (frameCount / elapsed) * 1000, frameCount, elapsed });
                  } else {
                    requestAnimationFrame(checkFPS);
                  }
                }
                requestAnimationFrame(checkFPS);
              });
            });
          } catch (err) {
            fpsData = { fps: 0, frameCount: 0, elapsed: 0, error: err.message };
          }
          
          // Collect JS memory metrics
          let memoryData;
          try {
            memoryData = await page.evaluate(() => {
              if (performance && performance.memory) {
                return {
                  jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                  totalJSHeapSize: performance.memory.totalJSHeapSize,
                  usedJSHeapSize: performance.memory.usedJSHeapSize
                };
              }
              return { note: 'Memory info not available' };
            });
          } catch (err) {
            memoryData = { error: err.message };
          }
          let webgpuInfo = {};
          try {
            webgpuInfo = await page.evaluate(() => {
              if (navigator.gpu) {
                const adapter = navigator.gpu.adapter || {};
                return {
                  adapter: adapter.name || 'Unknown',
                  features: Array.from(adapter.features || []),
                  initialized: true
                };
              }
              return { initialized: false };
            });
          } catch (err) {
            webgpuInfo = { error: err.message };
          }
  
          const sample = {
            timestamp: new Date().toISOString(),
            performance: perfMetrics.metrics.reduce((acc, m) => { 
              acc[m.name] = m.value; 
              return acc; 
            }, {}),
            system: macMetrics,
            fps: fpsData,
            memory: memoryData,
            webllm: webLLMStatus,
            webgpu: webgpuInfo
          };
          
          // Add to metrics
          metrics.samples.push(sample);
          
          // Add to current phase if one is active
          for (const phaseName in metrics.phases) {
            if (!metrics.phases[phaseName].end) {
              metrics.phases[phaseName].samples.push(sample);
            }
          }
          
          // Store system info from first sample
          if (!metrics.system && macMetrics.system) {
            metrics.system = macMetrics.system;
          }
          
          // Log progress periodically
          if (metrics.samples.length % 10 === 0) {
            console.log(`Collected ${metrics.samples.length} samples, app state: ${webLLMStatus.state}`);
          }
          
          // Wait before next sample
          await wait(CONFIG.sampleIntervalMs);
        } catch (error) {
          console.error(`Error collecting metrics: ${error.message}`);
          await wait(CONFIG.sampleIntervalMs);
        }
      }
    })();

    try {
      const hasModelSelection = await page.evaluate(() => {
        return !!document.querySelector('#model-selection');
      });
      
      if (hasModelSelection && CONFIG.modelName) {
        startPhase('model_selection');
        // Wait for the model selection dropdown to appear
        await page.waitForSelector('#model-selection', { visible: true });
        
        // Get available models
        const availableModels = await page.$$eval('#model-selection option', options => 
          options.map(option => option.value)
        );
        
        logEvent('Available models', { models: availableModels });
        
        // Select the model if available
        if (availableModels.includes(CONFIG.modelName)) {
          await page.select('#model-selection', CONFIG.modelName);
          logEvent('Model selected', { model: CONFIG.modelName });
        } else {
          logEvent('Model not available', { 
            requested: CONFIG.modelName, 
            available: availableModels 
          });
        }
        endPhase('model_selection');
      }
      
      // Check if download button exists and click it
      const hasDownloadButton = await page.evaluate(() => {
        return !!document.querySelector('#download');
      });
      
      if (hasDownloadButton) {
        startPhase('model_download');
        // Wait for download button to be enabled
        await page.waitForSelector('#download:not([disabled])', { 
          timeout: CONFIG.timeouts.modelLoading
        });
        
        // Click download
        await page.click('#download');
        logEvent('Download button clicked');
        
        // Wait for model to finish loading
        try {
          await page.waitForFunction(
            () => {
              const statusElement = document.querySelector('#download-status');
              return statusElement && statusElement.textContent.includes('Finish loading on WebGPU');
            },
            { timeout: CONFIG.timeouts.modelLoading }
          );
          logEvent('Model loaded successfully');
        } catch (error) {
          logEvent('Model loading failed or timed out', { error: error.message });
        }
        endPhase('model_download');
      }

if (CONFIG.testPrompt) {
  startPhase('inference');

  const hasPromptInput = await page.evaluate(() => {
    return !!document.querySelector('#user-input');
  });
  
  if (hasPromptInput) {
    // Enter prompt
    await page.type('#user-input', CONFIG.testPrompt);
    logEvent('Test prompt entered', { prompt: CONFIG.testPrompt });
    
    const submitButton = await page.evaluate(() => {
      const buttons = [
        document.querySelector('#send'),
        document.querySelector('button[type="send"]'),
        ...Array.from(document.querySelectorAll('button')).filter(
          btn => ['send', 'submit', 'generate'].some(
            text => btn.textContent.toLowerCase().includes(text)
          )
        )
      ].filter(Boolean);
      
      return buttons.length > 0 ? buttons[0].id || 'found_button' : null;
    });
    
    if (submitButton) {
      logEvent('Submit button found', { buttonId: submitButton });
      if (submitButton === 'found_button') {
  
        await page.evaluate(() => {
          const btn = document.querySelector('#send') || 
            document.querySelector('button[type="send"]') ||
            Array.from(document.querySelectorAll('button')).find(
              btn => ['send', 'submit', 'generate'].some(
                text => btn.textContent.toLowerCase().includes(text)
              )
            );
          if (btn) btn.click();
        });
      } else {
      
        await page.click(`#${submitButton}`);
      }
      logEvent('Submit button clicked');
      logEvent('Waiting for generation to start');
      try {
      
        await Promise.race([
          page.waitForFunction(
            () => {
              const placeholder = document.querySelector('#user-input')?.placeholder;
              return placeholder && placeholder.toLowerCase().includes('generating');
            },
            { timeout: 10000 }
          ),
          page.waitForFunction(
            () => {
              const statusEl = document.querySelector('#inference-status, #generation-status, .status');
              return statusEl && statusEl.textContent.toLowerCase().includes('generating');
            },
            { timeout: 10000 }
          ),
          page.waitForFunction(
            () => {
            
              return Array.from(document.querySelectorAll('*')).some(
                el => el.offsetParent !== null && 
                     el.textContent && 
                     el.textContent.toLowerCase().includes('generating')
              );
            },
            { timeout: 10000 }
          )
        ]);
        
        logEvent('Generation started', { status: 'Generating' });
        let previousOutputLength = await page.evaluate(() => {
          const messages = Array.from(document.querySelectorAll('.message'));
          const lastMessage = messages[messages.length - 1];
          return lastMessage ? lastMessage.textContent.length : 0;
        });
        
    
        logEvent('Waiting for output to stabilize');
      
        let currentOutputLength = previousOutputLength;
        let maxWaitTime = CONFIG.timeouts.inference; // Maximum wait time
        let startTime = Date.now();
        
        // First wait for at least some output to appear
        while (currentOutputLength === 0 && (Date.now() - startTime < maxWaitTime)) {
          await wait(500); // Check every 500ms
          
          currentOutputLength = await page.evaluate(() => {
            const messages = Array.from(document.querySelectorAll('.message'));
            const lastMessage = messages[messages.length - 1];
            return lastMessage ? lastMessage.textContent.length : 0;
          });
          
          if (Date.now() - startTime > 10000 && currentOutputLength === 0) {
            // After 10 seconds with no output, log a warning
            logEvent('Warning: No output detected after 10 seconds, continuing to wait');
          }
        }
      
        const noChangeThreshold = 3000; // Time with no changes before assuming complete (3s)
        let lastChangeTime = Date.now();
        let chatStatsVisible = false;
        
        while ((Date.now() - lastChangeTime < noChangeThreshold || !chatStatsVisible) && 
               Date.now() - startTime < maxWaitTime) {
          await wait(300); // Check every 300ms
          
          currentOutputLength = await page.evaluate(() => {
            const messages = Array.from(document.querySelectorAll('.message'));
            const lastMessage = messages[messages.length - 1];
            return lastMessage ? lastMessage.textContent.length : 0;
          });
          
          if (currentOutputLength > previousOutputLength) {
            lastChangeTime = Date.now();
            logEvent('Output increasing', { 
              currentLength: currentOutputLength,
              delta: currentOutputLength - previousOutputLength
            });
            previousOutputLength = currentOutputLength;
          }
    
          chatStatsVisible = await page.evaluate(() => {
            const chatStats = document.querySelector('#chat-stats');
            if (!chatStats) return false;
  
            const style = window.getComputedStyle(chatStats);
            const isVisible = style.display !== 'none' && 
                             style.visibility !== 'hidden' && 
                             style.opacity !== '0';
            
            return isVisible;
          });
          
          if (chatStatsVisible) {
            logEvent('chat-stats element is now visible');
            await wait(500);
            break;
          }
          
          const isComplete = await page.evaluate(() => {
            // Check status elements
            const statusEl = document.querySelector('#inference-status, #generation-status, .status');
            if (statusEl && statusEl.textContent.toLowerCase().includes('complete')) return true;
            return Array.from(document.querySelectorAll('*')).some(
              el => el.offsetParent !== null && 
                   el.textContent && 
                   ['complete', 'done', 'finished'].some(word => 
                     el.textContent.toLowerCase().includes(word)
                   )
            );
          });
          
          if (isComplete) {
            logEvent('Other completion indicator detected');
            break;
          }
        }
        if (Date.now() - lastChangeTime >= noChangeThreshold) {
          logEvent('Inference completed (output stabilized)', { 
            outputLength: currentOutputLength,
            stabilizationTime: noChangeThreshold
          });
        } else if (Date.now() - startTime >= maxWaitTime) {
          logEvent('Inference timed out after maximum wait time', { 
            outputLength: currentOutputLength,
            maxWaitTime
          });
        }
        
        logEvent('Extracting performance statistics');
        try {
        
          const stats = await page.evaluate(() => {
            const statsElements = [
              document.querySelector('#chat-stats'),
              document.querySelector('.stats'),
              document.querySelector('.metrics'),
              document.querySelector('.performance'),
              ...Array.from(document.querySelectorAll('*')).filter(
                el => el.textContent && 
                     ['prefill', 'inference time', 'tokens/sec', 'decoding'].some(term => 
                       el.textContent.toLowerCase().includes(term)
                     )
              )
            ].filter(Boolean); 
            
            return statsElements.length > 0 ? 
              statsElements.map(el => el.textContent).join(' ') : '';
          });
          
          if (stats) {
            logEvent('Performance metrics found', { rawStats: stats });
            
            const prefillSpeed = stats.match(/Prefill Speed: ([\d.]+)/)?.[1];
            const decodingSpeed = stats.match(/Decoding Speed: ([\d.]+)/)?.[1];
            const inferenceTime = stats.match(/Total Inference Time: ([\d.]+)/)?.[1];
            const timeToFirstToken = stats.match(/Time to First Token: ([\d.]+)/)?.[1];
            
            logEvent('Performance metrics', {
              prefillSpeed: prefillSpeed ? `${prefillSpeed} tokens/sec` : 'N/A',
              decodingSpeed: decodingSpeed ? `${decodingSpeed} tokens/sec` : 'N/A',
              inferenceTime: inferenceTime ? `${inferenceTime} ms` : 'N/A',
              timeToFirstToken: timeToFirstToken ? `${timeToFirstToken} ms` : 'N/A'
            });
          } else {
            logEvent('No performance metrics found');
          }
        } catch (error) {
          logEvent('Error extracting performance metrics', { error: error.message });
        }
        
        const output = await page.evaluate(() => {
          const messages = Array.from(document.querySelectorAll('.message'));

          const lastMessage = messages[messages.length - 1];
          return lastMessage ? lastMessage.textContent : '';
        });
        
        logEvent('Output captured', { 
          outputLength: output.length,
          output: output.length > 200 ? output.substring(0, 200) + '...' : output
        });
        
      } catch (error) {
        logEvent('Error during inference detection', { error: error.message });
      }
    } else {
      logEvent('No submit button found');
    }
  } else {
    logEvent('No user input field found');
  }
  
  endPhase('inference');
}
      logEvent('Continuing metric collection for additional 10 seconds');
      await wait(10000);
      
    } catch (error) {
      logEvent('Error during page interaction', { error: error.message });
    } finally {
      endPhase('overall');

      await metricCollectionTask;

      fs.writeFileSync(CONFIG.outputFiles.metrics, JSON.stringify(metrics, null, 2));
      console.log(`Metrics saved to ${CONFIG.outputFiles.metrics}`);
   
      const htmlReport = generateHTMLReport(metrics);
      fs.writeFileSync(CONFIG.outputFiles.visualization, htmlReport);
      console.log(`Visualization saved to ${CONFIG.outputFiles.visualization}`);
      startVisualizationServer(htmlReport, 1234);
    }
  } catch (error) {
    console.error('Fatal error during profiling:', error);
  }
}

function startVisualizationServer(htmlContent, port) {
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlContent);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  server.listen(port, async () => {
    console.log(`Visualization server running at http://localhost:${port}`);
    try {
      const openModule = await import('open');
      const open = openModule.default;
      console.log('Opening browser to view results...');
      await open(`http://localhost:${port}`);
    } catch (error) {
      console.log(`Could not open browser automatically: ${error.message}`);
      console.log(`Please navigate to http://localhost:${port} manually.`);
    }
  });
}

function generateHTMLReport(metrics) {
  const systemInfo = metrics.system || {};
  const phases = Object.keys(metrics.phases).map(name => {
    const phase = metrics.phases[name];
    return {
      name,
      start: new Date(phase.start).toLocaleTimeString(),
      end: phase.end ? new Date(phase.end).toLocaleTimeString() : 'Ongoing',
      duration: phase.duration ? `${(phase.duration / 1000).toFixed(1)}s` : 'N/A',
      sampleCount: phase.samples.length
    };
  });
  
  // Extract timestamps for time series charts
  const timestamps = metrics.samples.map(s => new Date(s.timestamp).toLocaleTimeString());
  
  // Extract FPS data
  const fpsValues = metrics.samples.map(s => s.fps?.fps || 0);
  
  // Extract CPU metrics
  const cpuUser = metrics.samples.map(s => s.system?.cpu?.user || 0);
  const cpuSystem = metrics.samples.map(s => s.system?.cpu?.system || 0);
  const cpuIdle = metrics.samples.map(s => s.system?.cpu?.idle || 0);
  
  // Extract memory metrics
  const memFree = metrics.samples.map(s => s.system?.memory?.free || 0);
  const memActive = metrics.samples.map(s => s.system?.memory?.active || 0);
  const memInactive = metrics.samples.map(s => s.system?.memory?.inactive || 0);
  const memWired = metrics.samples.map(s => s.system?.memory?.wired || 0);
  
  // Extract GPU metrics
  const gpuUtil = metrics.samples.map(s => s.system?.gpu?.utilization || 0);
  const gpuTemp = metrics.samples.map(s => s.system?.gpu?.temperature || 0);
  
  // Extract JS memory metrics
  const jsMemData = metrics.samples.map(s => ({
    jsHeapSizeLimit: s.memory?.jsHeapSizeLimit || 0,
    totalJSHeapSize: s.memory?.totalJSHeapSize || 0,
    usedJSHeapSize: s.memory?.usedJSHeapSize || 0
  }));
  
  // Create phase markers for charts
  const phaseMarkers = [];
  Object.keys(metrics.phases).forEach(name => {
    const phase = metrics.phases[name];
    if (phase.start) {
      phaseMarkers.push({
        name,
        startIndex: metrics.samples.findIndex(s => s.timestamp >= phase.start),
        endIndex: phase.end ? metrics.samples.findIndex(s => s.timestamp >= phase.end) : metrics.samples.length - 1
      });
    }
  });
  
  // Generate events table
  const eventsTable = metrics.events.map(e => `
    <tr>
      <td>${new Date(e.timestamp).toLocaleTimeString()}</td>
      <td>${e.name}</td>
      <td>${Object.keys(e).filter(k => k !== 'timestamp' && k !== 'name').map(k => 
        `<strong>${k}:</strong> ${
          typeof e[k] === 'object' ? JSON.stringify(e[k]) : e[k]
        }`
      ).join('<br>')}</td>
    </tr>
  `).join('');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebLLM Performance Analysis</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@1.0.2/dist/chartjs-plugin-annotation.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1400px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; }
    h1, h2 { color: #333; }
    .chart-container { width: 100%; height: 300px; margin-bottom: 30px; }
    .section { margin-bottom: 40px; }
    .grid { display: flex; flex-wrap: wrap; gap: 20px; }
    .grid .chart-container { flex: 1 1 45%; }
    .info-box { background: #f8f9fa; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
    .info-item { margin-bottom: 8px; }
    .info-label { font-weight: bold; }
    .phase { background: #e9ecef; border-radius: 5px; padding: 10px; margin-bottom: 10px; }
    .phase-name { font-weight: bold; }
    .events-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .events-table th, .events-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    .events-table th { background-color: #f2f2f2; }
    .tab { overflow: hidden; border: 1px solid #ccc; background-color: #f1f1f1; border-radius: 5px 5px 0 0; }
    .tab button { background-color: inherit; float: left; border: none; outline: none; cursor: pointer; padding: 14px 16px; transition: 0.3s; }
    .tab button:hover { background-color: #ddd; }
    .tab button.active { background-color: #fff; border-bottom: 2px solid #4CAF50; }
    .tabcontent { display: none; padding: 20px; border: 1px solid #ccc; border-top: none; border-radius: 0 0 5px 5px; }
    .tabcontent.active { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>WebLLM Performance Analysis</h1>
    <p>Data collected at ${new Date().toLocaleString()}</p>
    
    <!-- Tabs -->
    <div class="tab">
      <button class="tablinks active" onclick="openTab(event, 'overview')">Overview</button>
      <button class="tablinks" onclick="openTab(event, 'cpu-gpu')">CPU & GPU</button>
      <button class="tablinks" onclick="openTab(event, 'memory')">Memory</button>
      <button class="tablinks" onclick="openTab(event, 'events')">Events Log</button>
    </div>
    
    <!-- Overview Tab -->
    <div id="overview" class="tabcontent active">
      <!-- System Information Section -->
      <div class="section">
        <h2>System Information</h2>
        <div class="info-box">
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Model:</span> ${systemInfo.model || 'Unknown'}</div>
            <div class="info-item"><span class="info-label">Chip:</span> ${systemInfo.chip || 'Unknown'}</div>
            <div class="info-item"><span class="info-label">Memory:</span> ${systemInfo.totalMemory || 'Unknown'}</div>
            <div class="info-item"><span class="info-label">GPU:</span> ${systemInfo.gpuModel || 'Unknown'}</div>
            <div class="info-item"><span class="info-label">VRAM:</span> ${systemInfo.vram || 'Unknown'}</div>
          </div>
        </div>
      </div>
      
      <!-- Test Configuration -->
      <div class="section">
        <h2>Test Configuration</h2>
        <div class="info-box">
          <div class="info-grid">
            <div class="info-item"><span class="info-label">WebLLM URL:</span> ${metrics.config.WEBGL_URL || WEBGL_URL}</div>
            <div class="info-item"><span class="info-label">Model:</span> ${metrics.config.modelName || 'Default'}</div>
            <div class="info-item"><span class="info-label">Test Prompt:</span> ${metrics.config.testPrompt || 'None'}</div>
            <div class="info-item"><span class="info-label">Sample Interval:</span> ${metrics.config.sampleIntervalMs}ms</div>
            <div class="info-item"><span class="info-label">Total Samples:</span> ${metrics.samples.length}</div>
          </div>
        </div>
      </div>
      
      <!-- Test Phases -->
      <div class="section">
        <h2>Test Phases</h2>
        <div class="info-box">
          ${phases.map(phase => `
            <div class="phase">
              <div class="phase-name">${phase.name}</div>
              <div>Start: ${phase.start} | End: ${phase.end} | Duration: ${phase.duration}</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- FPS Chart Section -->
      <div class="section">
        <h2>FPS Over Time</h2>
        <div class="chart-container">
          <canvas id="fpsChart"></canvas>
        </div>
      </div>
    </div>
    
    <!-- CPU & GPU Tab -->
    <div id="cpu-gpu" class="tabcontent">
      <!-- CPU Utilization Section -->
      <div class="section">
        <h2>CPU Utilization (%)</h2>
        <div class="chart-container">
          <canvas id="cpuChart"></canvas>
        </div>
      </div>
      
      <!-- GPU Section -->
      <div class="section">
        <h2>GPU Metrics</h2>
        <div class="grid">
          <div class="chart-container"><canvas id="gpuUtilChart"></canvas></div>
          <div class="chart-container"><canvas id="gpuTempChart"></canvas></div>
        </div>
      </div>
    </div>
    
    <!-- Memory Tab -->
    <div id="memory" class="tabcontent">
      <!-- System Memory Section -->
      <div class="section">
        <h2>System Memory (MB)</h2>
        <div class="chart-container">
          <canvas id="memoryChart"></canvas>
        </div>
      </div>
      
      <!-- JS Memory Section -->
      <div class="section">
        <h2>JavaScript Memory</h2>
        <div class="chart-container">
          <canvas id="jsMemoryChart"></canvas>
        </div>
        <p><em>Note: JavaScript memory metrics might be unavailable on some browsers.</em></p>
      </div>
    </div>
    
    <!-- Events Tab -->
    <div id="events" class="tabcontent">
      <div class="section">
        <h2>Events Log</h2>
        <table class="events-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Event</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${eventsTable}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  
  <script>
    // Tab functionality
    function openTab(evt, tabName) {
      const tabcontent = document.getElementsByClassName("tabcontent");
      for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
      }
      
      const tablinks = document.getElementsByClassName("tablinks");
      for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
      }
      
      document.getElementById(tabName).classList.add("active");
      evt.currentTarget.classList.add("active");
    }
    
    // Phase annotation plugin setup
    const phaseAnnotations = ${JSON.stringify(phaseMarkers)}.map(marker => {
      return {
        type: 'box',
        xMin: marker.startIndex,
        xMax: marker.endIndex,
        backgroundColor: 'rgba(200, 200, 200, 0.2)',
        borderColor: 'rgba(100, 100, 100, 0.2)',
        label: {
          display: true,
          content: marker.name,
          position: 'start'
        }
      };
    });
    
    // Helper function to create a simple line chart with phase annotations
    function createChart(canvasId, label, data, borderColor) {
      return new Chart(document.getElementById(canvasId).getContext('2d'), {
        type: 'line',
        data: { 
          labels: ${JSON.stringify(timestamps)}, 
          datasets: [{ 
            label: label, 
            data: data, 
            borderColor: borderColor, 
            fill: false, 
            tension: 0.1 
          }] 
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            annotation: {
              annotations: phaseAnnotations
            },
            legend: { display: true, position: 'top' }
          }
        }
      });
    }
    
    // FPS Chart
    createChart('fpsChart', 'Frames Per Second', ${JSON.stringify(fpsValues)}, 'green');
    
    // CPU Usage Chart
    new Chart(document.getElementById('cpuChart').getContext('2d'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(timestamps)},
        datasets: [
          { label: 'User', data: ${JSON.stringify(cpuUser)}, borderColor: 'blue', fill: false },
          { label: 'System', data: ${JSON.stringify(cpuSystem)}, borderColor: 'red', fill: false },
          { label: 'Idle', data: ${JSON.stringify(cpuIdle)}, borderColor: 'green', fill: false }
        ]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Percentage (%)'
            }
          }
        },
        plugins: {
          annotation: {
            annotations: phaseAnnotations
          }
        }
      }
    });
    
    // Memory Chart
    new Chart(document.getElementById('memoryChart').getContext('2d'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(timestamps)},
        datasets: [
          { label: 'Free', data: ${JSON.stringify(memFree)}, borderColor: 'green', fill: false },
          { label: 'Active', data: ${JSON.stringify(memActive)}, borderColor: 'blue', fill: false },
          { label: 'Inactive', data: ${JSON.stringify(memInactive)}, borderColor: 'purple', fill: false },
          { label: 'Wired', data: ${JSON.stringify(memWired)}, borderColor: 'orange', fill: false }
        ]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          annotation: {
            annotations: phaseAnnotations
          }
        }
      }
    });
    
    // GPU Charts (with phases)
    createChart('gpuUtilChart', 'GPU Utilization (%)', ${JSON.stringify(gpuUtil)}, 'red');
    createChart('gpuTempChart', 'GPU Temperature (°C)', ${JSON.stringify(gpuTemp)}, 'orange');
    
    // JS Memory Chart
    new Chart(document.getElementById('jsMemoryChart').getContext('2d'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(timestamps)},
        datasets: [
          { 
            label: 'JS Heap Size Limit', 
            data: ${JSON.stringify(jsMemData.map(d => d.jsHeapSizeLimit / (1024 * 1024)))},
            borderColor: 'blue', 
            fill: false 
          },
          { 
            label: 'Total JS Heap Size', 
            data: ${JSON.stringify(jsMemData.map(d => d.totalJSHeapSize / (1024 * 1024)))}, 
            borderColor: 'orange', 
            fill: false 
          },
          { 
            label: 'Used JS Heap Size', 
            data: ${JSON.stringify(jsMemData.map(d => d.usedJSHeapSize / (1024 * 1024)))}, 
            borderColor: 'red', 
            fill: false 
          }
        ]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        scales: {
          y: {
            title: {
              display: true,
              text: 'Size (MB)'
            }
          }
        },
        plugins: {
          annotation: {
            annotations: phaseAnnotations
          }
        }
      }
    });
  </script>
</body>
</html>`;
}

profileWebLLM().catch(err => {
  console.error('Fatal error in main process:', err);
  process.exit(1);
});