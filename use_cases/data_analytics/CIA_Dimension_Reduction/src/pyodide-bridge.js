// pyodide-bridge.js
// This module serves as a bridge between the JavaScript VTK.js application and Python dimensionality reduction algorithms

class PyodideBridge {
  constructor() {
    this.pyodide = null;
    this.isInitialized = false;
    this.isLoading = false;
    this.availableAlgorithms = {
      pca: false,
      tsne: false,
      umap: false
    };
    this.callbacks = {
      onProgress: null,
      onError: null,
      onComplete: null
    };
  }

  async loadPyodideScript() {
    return new Promise((resolve, reject) => {
      // Check if Pyodide is already loaded
      if (typeof loadPyodide !== 'undefined') {
        console.log('Pyodide script already loaded');
        return resolve();
      }

      console.log('Loading Pyodide script...');
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
      script.onload = () => {
        console.log('Pyodide script loaded successfully');
        resolve();
      };
      script.onerror = (e) => {
        console.error('Failed to load Pyodide script:', e);
        reject(new Error('Failed to load Pyodide script'));
      };
      document.head.appendChild(script);
    });
  }

    // Replace the NumPy loading and verification with this simpler approach
  async initialize() {
    if (this.isInitialized) return Promise.resolve(this.availableAlgorithms);
    if (this.isLoading) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.isInitialized) {
            clearInterval(checkInterval);
            resolve(this.availableAlgorithms);
          }
        }, 100);
      });
    }
    
    try {
      this.isLoading = true;
      console.log('Loading Pyodide...');
      
      // Show loading message
      this._showStatus('Loading Python environment...', 'info');

      // First, ensure the Pyodide script is loaded
      await this.loadPyodideScript();
      
      // Load Pyodide
      this.pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
      });
      
      console.log('Pyodide loaded. Installing required packages...');
      this._showStatus('Installing required packages...', 'info');
      
      // SIMPLIFIED NUMPY LOADING - much more robust
      try {
        console.log('Loading numpy package...');
        await this.pyodide.loadPackage('numpy');
        
        // Basic verification with simpler output
        const numpyStatus = await this.pyodide.runPythonAsync(`
  import sys
  print("Python version:", sys.version)

  try:
    import numpy as np
    print("NumPy successfully imported, version:", np.__version__)
    "success:" + np.__version__
  except Exception as e:
    print("NumPy import error:", e)
    "error:" + str(e)
        `);
        
        // Parse the result string
        console.log("NumPy status:", numpyStatus);
        if (typeof numpyStatus === 'string' && numpyStatus.startsWith('success:')) {
          const version = numpyStatus.split('success:')[1];
          console.log(`NumPy ${version} loaded successfully`);
          this._showStatus(`NumPy ${version} loaded`, 'success');
        } else {
          const errorMsg = numpyStatus.split('error:')[1] || 'Unknown error';
          throw new Error(`NumPy verification failed: ${errorMsg}`);
        }
        
        // Now load micropip
        console.log('Loading micropip...');
        await this.pyodide.loadPackage('micropip');
        
      } catch (numpyError) {
        console.error('Error loading NumPy:', numpyError);
        
        // All algorithms will use JavaScript
        this.availableAlgorithms.pca = false;
        this.availableAlgorithms.tsne = false;
        this.availableAlgorithms.umap = false;
        
        throw new Error('Critical dependency NumPy failed to load: ' + numpyError.message);
      }
      
      // Set default values for algorithm availability
      this.availableAlgorithms.pca = false;
      this.availableAlgorithms.tsne = false;
      this.availableAlgorithms.umap = false;
      
      // Try to install scikit-learn - SIMPLIFIED APPROACH
      try {
        this._showStatus('Installing scikit-learn...', 'info');
        
        // Try to install scikit-learn with better error handling
        const sklearnResult = await this.pyodide.runPythonAsync(`
  import micropip
  import sys

  try:
    # First try to import sklearn
    import sklearn
    print("scikit-learn is already available")
    "success:" + sklearn.__version__
  except ImportError:
    try:
      # Try to install sklearn
      print("Installing scikit-learn...")
      await micropip.install('scikit-learn')
      import sklearn
      print("scikit-learn installed successfully:", sklearn.__version__)
      "success:" + sklearn.__version__
    except Exception as e:
      print("scikit-learn installation error:", e)
      "error:" + str(e)
        `);
        
        // Parse the result string
        console.log("scikit-learn status:", sklearnResult);
        let sklearnSuccess = false;
        
        if (typeof sklearnResult === 'string' && sklearnResult.startsWith('success:')) {
          const version = sklearnResult.split('success:')[1];
          console.log(`scikit-learn ${version} loaded successfully`);
          this._showStatus(`scikit-learn ${version} loaded`, 'success');
          sklearnSuccess = true;
        } else {
          console.warn('scikit-learn not available:', sklearnResult);
          this._showStatus('scikit-learn not available - using JavaScript fallbacks', 'warning');
        }
        
        // Check for components only if scikit-learn loaded
        if (sklearnSuccess) {
          // Check for PCA
          const pcaResult = await this.pyodide.runPythonAsync(`
  try:
    from sklearn.decomposition import PCA
    print("PCA component available")
    "success"
  except Exception as e:
    print("PCA import error:", e)
    "error:" + str(e)
          `);
          
          this.availableAlgorithms.pca = pcaResult === "success";
          
          // Check for TSNE
          const tsneResult = await this.pyodide.runPythonAsync(`
  try:
    from sklearn.manifold import TSNE
    print("TSNE component available")
    "success"
  except Exception as e:
    print("TSNE import error:", e)
    "error:" + str(e)
          `);
          
          this.availableAlgorithms.tsne = tsneResult === "success";
        }
        
      } catch (e) {
        console.warn('Failed to install scikit-learn:', e);
        this._showStatus('Warning: scikit-learn installation failed. Using JavaScript fallbacks.', 'warning');
      }
      
      // Skip UMAP installation as it requires numba which is not available in browser
      console.log('UMAP will use JavaScript implementation (numba dependency not available in browser)');
      this._showStatus('Info: UMAP will use JavaScript implementation (numba dependency not available in browser)', 'info');
      
      // Load our dimensionality reduction module with better error handling - SIMPLIFIED
      try {
        await this._loadPythonModule();
      } catch (moduleError) {
        console.error('Error loading dimensionality reduction module:', moduleError);
        this._showStatus('Warning: Python module loading failed. Using JavaScript fallbacks.', 'warning');
        
        // Make sure all algorithms use JavaScript fallbacks
        this.availableAlgorithms.pca = false;
        this.availableAlgorithms.tsne = false;
        this.availableAlgorithms.umap = false;
      }
      
      this.isInitialized = true;
      this.isLoading = false;
      console.log('Pyodide environment ready!', this.availableAlgorithms);
      
      if (this.availableAlgorithms.pca || this.availableAlgorithms.tsne) {
        this._showStatus(`Python environment ready! Available algorithms: ${
          Object.entries(this.availableAlgorithms)
            .filter(([_, available]) => available)
            .map(([name]) => name.toUpperCase())
            .join(', ')
        }`, 'success');
      } else {
        this._showStatus('Python environment loaded but no algorithms available. Using JavaScript fallbacks.', 'warning');
      }
      
      return Promise.resolve(this.availableAlgorithms);
    } catch (error) {
      this.isLoading = false;
      console.error('Failed to initialize Pyodide:', error);
      this._showStatus('Failed to load Python environment: ' + error.message, 'error');
      return Promise.reject(error);
    }
  }
  
  async _loadPythonModule() {
    // Define our Python module with dimensionality reduction functions
    const pythonModule = document.getElementById('python-dim-reduction')?.textContent;
    
    if (!pythonModule) {
      console.error('Python module not found in document');
      throw new Error('Python dimensionality reduction module not found');
    }
    
    try {
      // SIMPLIFIED MODULE LOADING - removed complex verification code
      console.log('Loading dimensionality reduction module...');
      
      // Use simpler approach with better error handling
      const moduleResult = await this.pyodide.runPythonAsync(`
  # Start with only guaranteed imports
  import numpy as np
  import sys
  print("Python version:", sys.version)
  print("NumPy version:", np.__version__)
  
  # Define minimal safe import function
  def safe_import(module_name):
      try:
          return __import__(module_name)
      except ImportError:
          print(f"Could not import {module_name}")
          return None
  
  # Set up basic variables - doesn't matter if we fail
  PCA_module = safe_import('sklearn.decomposition')
  TSNE_module = safe_import('sklearn.manifold')
  UMAP_module = None  # We know this will fail in browser
  
  PCA = getattr(PCA_module, 'PCA', None) if PCA_module else None
  TSNE = getattr(TSNE_module, 'TSNE', None) if TSNE_module else None
  UMAP = None
  
  # Minimal test to see if we can define a function
  def test_function():
      print("Test function defined successfully")
      return "success"
  
  result = test_function()
  result
      `);
      
      console.log('Basic Python functionality test:', moduleResult);
      
      if (moduleResult !== "success") {
        throw new Error('Basic Python functionality test failed');
      }
      
      // Now try to load the actual module code - but keep it extremely simple
      const loadModuleResult = await this.pyodide.runPythonAsync(`
  try:
      # First, define our own simple normalize_points function
      def normalize_points(points):
          """Simple normalization function"""
          try:
              # Basic normalization
              points_array = np.array(points, dtype=np.float64)
              min_vals = np.min(points_array, axis=0)
              max_vals = np.max(points_array, axis=0)
              range_vals = max_vals - min_vals
              
              # Check for valid range
              if np.any(range_vals < 0.0001):
                  print("Warning: Small range detected")
                  return points_array
                  
              # Normalize to [-1, 1]
              normalized = 2 * (points_array - min_vals) / range_vals - 1
              return normalized
              
          except Exception as e:
              print(f"Error in normalization: {e}")
              return np.array(points)
              
      # Define minimal PCA function that works
      def apply_pca(points, n_components=3):
          """Apply PCA reduction"""
          try:
              if PCA is None:
                  print("PCA not available")
                  return np.array([])
                  
              points_array = np.array(points)
              pca = PCA(n_components=n_components)
              reduced = pca.fit_transform(points_array)
              return normalize_points(reduced)
          except Exception as e:
              print(f"PCA error: {e}")
              return np.array([])
              
      # Define minimal t-SNE function
      def apply_tsne(points, perplexity=30, n_iter=1000, n_components=3):
          """Apply t-SNE reduction"""
          try:
              if TSNE is None:
                  print("TSNE not available")
                  return np.array([])
                  
              points_array = np.array(points)
              tsne = TSNE(n_components=n_components, perplexity=perplexity, n_iter=n_iter)
              reduced = tsne.fit_transform(points_array)
              return normalize_points(reduced)
          except Exception as e:
              print(f"t-SNE error: {e}")
              return np.array([])
      
      # Minimal placeholder for UMAP (will never run)
      def apply_umap(points, n_neighbors=15, n_iter=300, n_components=3):
          """UMAP placeholder - will never run in browser"""
          print("UMAP not available in browser")
          return np.array([])
          
      # Simple differences function
      def calculate_differences(original_points, reduced_points):
          """Calculate differences between point sets"""
          try:
              orig = np.array(original_points)
              reduced = np.array(reduced_points)
              
              if len(orig) != len(reduced):
                  if len(reduced) < len(orig):
                      reduced = np.vstack([reduced, np.zeros((len(orig) - len(reduced), reduced.shape[1]))])
                  else:
                      reduced = reduced[:len(orig)]
                      
              displacements = orig - reduced
              magnitudes = np.linalg.norm(displacements, axis=1)
              
              return {
                  'displacements': displacements,
                  'magnitudes': magnitudes,
                  'max': np.max(magnitudes),
                  'avg': np.mean(magnitudes)
              }
          except Exception as e:
              print(f"Error calculating differences: {e}")
              return None
      
      # Return success indicator
      "success"
  except Exception as e:
      print(f"Module loading error: {e}")
      "error:" + str(e)
      `);
      
      console.log('Module loading result:', loadModuleResult);
      
      if (loadModuleResult !== "success") {
        throw new Error('Failed to load module: ' + loadModuleResult);
      }
      
      console.log('Python dimensionality reduction module loaded successfully.');
    } catch (error) {
      console.error('Error loading Python module:', error);
      throw error;
    }
  }
  
  _showStatus(message, type = 'info') {
    // Display status messages
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(message, type);
    }
    
    // Also show a UI status message
    try {
      let statusElement = document.getElementById('pyodideStatus');
      if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'pyodideStatus';
        statusElement.style.position = 'absolute';
        statusElement.style.top = '10px';
        statusElement.style.left = '50%';
        statusElement.style.transform = 'translateX(-50%)';
        statusElement.style.padding = '8px 16px';
        statusElement.style.borderRadius = '4px';
        statusElement.style.zIndex = '2000';
        document.body.appendChild(statusElement);
      }
      
      // Style based on message type
      switch(type) {
        case 'error':
          statusElement.style.background = 'rgba(220, 53, 69, 0.8)';
          statusElement.style.color = 'white';
          break;
        case 'success':
          statusElement.style.background = 'rgba(40, 167, 69, 0.8)';
          statusElement.style.color = 'white';
          break;
        case 'warning':
          statusElement.style.background = 'rgba(255, 193, 7, 0.8)';
          statusElement.style.color = 'black';
          break;
        default: // info
          statusElement.style.background = 'rgba(0, 123, 255, 0.8)';
          statusElement.style.color = 'white';
      }
      
      statusElement.textContent = message;
      
      // Auto-hide for success/info messages
      if (type === 'success' || type === 'info') {
        setTimeout(() => {
          if (statusElement.parentNode) {
            statusElement.parentNode.removeChild(statusElement);
          }
        }, 5000);
      }
    } catch (e) {
      console.error('Error showing status:', e);
    }
  }
  
  isAlgorithmAvailable(name) {
    return this.availableAlgorithms[name.toLowerCase()] || false;
  }
  
  async applyPCA(points, n_components = 3) {
    await this.initialize();
    
    // Check if PCA is available
    if (!this.availableAlgorithms.pca) {
      throw new Error('PCA is not available in Python environment');
    }
    
    try {
      this._showStatus('Applying PCA...', 'info');
      
      // Convert JavaScript array to Python numpy array - FIXED INDENTATION
      this.pyodide.globals.set('js_points', points);
      const result = await this.pyodide.runPythonAsync(`import numpy as np

# Validate input data
try:
  points_array = np.array(js_points, dtype=np.float64)
  print(f"Input shape: {points_array.shape}, dtype: {points_array.dtype}")
  
  # Check for NaNs or inf values
  if np.any(np.isnan(points_array)) or np.any(np.isinf(points_array)):
    print("Warning: Input contains NaN or infinite values")
    points_array = np.nan_to_num(points_array, nan=0.0, posinf=0.0, neginf=0.0)
  
  # Apply PCA and ensure output is valid
  result = apply_pca(points_array, n_components=${n_components})
  
  # Validate result before returning
  if result is None or len(result) == 0:
    print("PCA returned empty result")
    result = np.zeros((len(points_array), ${n_components}))
  
  # Convert to Python list for JS transfer
  result_list = result.tolist()
  print(f"Output shape: {np.array(result_list).shape}")
  result_list
except Exception as e:
  print(f"Error processing points for PCA: {e}")
  # Return empty list as fallback
  []`);
      
      // Verify we got a valid result back
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error('PCA returned invalid or empty result');
      }
      
      this._showStatus('PCA completed successfully!', 'success');
      
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete('pca', result);
      }
      
      return result;
    } catch (error) {
      console.error('Error in PCA:', error);
      this._showStatus('PCA failed: ' + error.message, 'error');
      
      if (this.callbacks.onError) {
        this.callbacks.onError('pca', error);
      }
      
      throw error;
    }
  }
  
  async applyTSNE(points, perplexity = 30, iterations = 1000, n_components = 3) {
    await this.initialize();
    
    // Check if t-SNE is available
    if (!this.availableAlgorithms.tsne) {
      throw new Error('t-SNE is not available in Python environment');
    }
    
    try {
      this._showStatus('Applying t-SNE (this may take a while)...', 'info');
      
      // Convert JavaScript array to Python numpy array - FIXED INDENTATION
      this.pyodide.globals.set('js_points', points);
      const result = await this.pyodide.runPythonAsync(`import numpy as np

# Validate input data
try:
  points_array = np.array(js_points, dtype=np.float64)
  print(f"Input shape: {points_array.shape}, dtype: {points_array.dtype}")
  
  # Check for NaNs or inf values
  if np.any(np.isnan(points_array)) or np.any(np.isinf(points_array)):
    print("Warning: Input contains NaN or infinite values")
    points_array = np.nan_to_num(points_array, nan=0.0, posinf=0.0, neginf=0.0)
  
  # Apply t-SNE and ensure output is valid
  result = apply_tsne(
    points_array, 
    perplexity=${perplexity}, 
    n_iter=${iterations}, 
    n_components=${n_components}
  )
  
  # Validate result before returning
  if result is None or len(result) == 0:
    print("t-SNE returned empty result")
    result = np.zeros((len(points_array), ${n_components}))
  
  # Convert to Python list for JS transfer
  result_list = result.tolist()
  print(f"Output shape: {np.array(result_list).shape}")
  result_list
except Exception as e:
  print(f"Error processing points for t-SNE: {e}")
  # Return empty list as fallback
  []`);
      
      // Verify we got a valid result back
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error('t-SNE returned invalid or empty result');
      }
      
      this._showStatus('t-SNE completed successfully!', 'success');
      
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete('tsne', result);
      }
      
      return result;
    } catch (error) {
      console.error('Error in t-SNE:', error);
      this._showStatus('t-SNE failed: ' + error.message, 'error');
      
      if (this.callbacks.onError) {
        this.callbacks.onError('tsne', error);
      }
      
      throw error;
    }
  }
  
  async applyUMAP(points, n_neighbors = 15, iterations = 300, n_components = 3) {
    await this.initialize();
    
    console.log('UMAP Python implementation is unavailable due to numba dependency');
    this._showStatus('UMAP requires numba which is not available in browser environment. Using JavaScript implementation.', 'info');
    
    // Always throw an error to ensure fallback to JavaScript
    throw new Error('UMAP is not available in Python environment due to numba dependency');
  }
  
  async calculateDifferences(originalPoints, reducedPoints) {
    await this.initialize();
    try {
      // Convert JavaScript arrays to Python numpy arrays - FIXED INDENTATION
      this.pyodide.globals.set('js_original_points', originalPoints);
      this.pyodide.globals.set('js_reduced_points', reducedPoints);
      
      const result = await this.pyodide.runPythonAsync(`import numpy as np

original_array = np.array(js_original_points)
reduced_array = np.array(js_reduced_points)

differences = calculate_differences(original_array, reduced_array)

# Convert numpy arrays in the result dictionary to lists for JavaScript
if differences is not None:
    differences['displacements'] = differences['displacements'].tolist()
    differences['magnitudes'] = differences['magnitudes'].tolist()
    
differences`);
      
      return result;
    } catch (error) {
      console.error('Error calculating differences:', error);
      
      if (this.callbacks.onError) {
        this.callbacks.onError('differences', error);
      }
      
      throw error;
    }
  }
}

// Create an instance with all methods explicitly defined
const bridge = new PyodideBridge();

// Ensure all required methods are directly on the object (not just in prototype)
const explicitBridge = {
  // Properties
  pyodide: null,
  isInitialized: false,
  isLoading: false,
  availableAlgorithms: {
    pca: false,
    tsne: false,
    umap: false
  },
  callbacks: {
    onProgress: null,
    onError: null,
    onComplete: null
  },
  
  // Methods
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    console.log('PyodideBridge: setCallbacks called with:', callbacks);
  },
  
  async initialize() {
    return bridge.initialize.apply(bridge, arguments);
  },
  
  async loadPyodideScript() {
    return bridge.loadPyodideScript.apply(bridge, arguments);
  },
  
  async _loadPythonModule() {
    return bridge._loadPythonModule.apply(bridge, arguments);
  },
  
  _showStatus(message, type = 'info') {
    return bridge._showStatus.apply(bridge, [message, type]);
  },
  
  isAlgorithmAvailable(name) {
    return bridge.isAlgorithmAvailable.apply(bridge, [name]);
  },
  
  async applyPCA(points, n_components = 3) {
    return bridge.applyPCA.apply(bridge, [points, n_components]);
  },
  
  async applyTSNE(points, perplexity = 30, iterations = 1000, n_components = 3) {
    return bridge.applyTSNE.apply(bridge, [points, perplexity, iterations, n_components]);
  },
  
  async applyUMAP(points, n_neighbors = 15, iterations = 300, n_components = 3) {
    return bridge.applyUMAP.apply(bridge, [points, n_neighbors, iterations, n_components]);
  },
  
  async calculateDifferences(originalPoints, reducedPoints) {
    return bridge.calculateDifferences.apply(bridge, [originalPoints, reducedPoints]);
  }
};

// Add debugging info
console.log('PyodideBridge being exported with methods:', Object.keys(explicitBridge));

// Export the bridge with all methods explicitly defined
export default explicitBridge;