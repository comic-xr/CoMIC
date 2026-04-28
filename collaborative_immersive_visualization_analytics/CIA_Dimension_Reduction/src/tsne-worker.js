// File: tsne-worker.js
// This would be saved as a separate file and loaded as a web worker

// Import libraries inside the worker
importScripts('https://cdn.jsdelivr.net/npm/tsne-js@latest/dist/tsne.min.js');

// Handle messages from main thread
self.onmessage = function(event) {
  const { points, perplexity, iterations, maxPoints } = event.data;
  
  try {
    console.log(`[Worker] Starting t-SNE with ${points.length} points`);
    
    // Sample if needed
    let tsnePoints = points;
    let samplingIndices = [];
    
    if (points.length > maxPoints) {
      console.log(`[Worker] Sampling ${maxPoints} points from ${points.length}`);
      tsnePoints = [];
      samplingIndices = [];
      
      // Simple uniform sampling for now (more efficient in worker)
      const step = Math.floor(points.length / maxPoints);
      for (let i = 0; i < points.length; i += step) {
        if (tsnePoints.length < maxPoints) {
          samplingIndices.push(i);
          tsnePoints.push(points[i]);
        }
      }
    }
    
    // Clean data
    tsnePoints = tsnePoints.map(point => 
      point.map(val => typeof val === 'number' && !isNaN(val) ? val : 0)
    );
    
    // Initialize t-SNE with appropriate parameters
    const model = new TSNE({
      dim: 3,
      perplexity: Math.min(perplexity, Math.floor(tsnePoints.length / 5)),
      iterations: iterations,
      epsilon: 10
    });
    
    // Initialize data
    model.init({
      data: tsnePoints,
      type: 'dense'
    });
    
    // Run in batches and report progress
    const batchSize = 10;
    let currentIteration = 0;
    
    function runBatch() {
      // Run a batch of iterations
      for (let i = 0; i < batchSize && currentIteration < iterations; i++) {
        if (typeof model.step === 'function') {
          model.step();
        } else {
          // If no step function, we can't do incremental updates
          // Instead, we'll run all iterations at once
          if (i === 0) { // Only run once
            if (typeof model.run === 'function') {
              model.run();
            } else {
              throw new Error('TSNE implementation has no step or run method');
            }
          }
          break;
        }
        currentIteration++;
      }
      
      // Report progress
      if (currentIteration % 50 === 0 || currentIteration >= iterations) {
        self.postMessage({
          type: 'progress',
          progress: currentIteration / iterations
        });
      }
      
      // Continue or finish
      if (currentIteration < iterations && typeof model.step === 'function') {
        setTimeout(runBatch, 0);
      } else {
        // Get output
        const output = model.getOutput ? model.getOutput() : 
                      (model.Y ? model.Y : []);
        
        // Send result back to main thread
        self.postMessage({
          type: 'result',
          result: output,
          samplingIndices: samplingIndices,
          originalLength: points.length
        });
      }
    }
    
    // Start processing
    runBatch();
    
  } catch (error) {
    // Report error
    self.postMessage({
      type: 'error',
      message: error.message
    });
  }
};