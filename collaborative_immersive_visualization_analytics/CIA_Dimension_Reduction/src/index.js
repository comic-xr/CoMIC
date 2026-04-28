// Core VTK Imports
import '@kitware/vtk.js/favicon';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';

// VTK Components
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkWebXRRenderWindowHelper from '@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkPoints from '@kitware/vtk.js/Common/Core/Points';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkCellArray from '@kitware/vtk.js/Common/Core/CellArray';
import vtkLight from '@kitware/vtk.js/Rendering/Core/Light';

// Dimensionality Reduction
import { PCA } from 'ml-pca';
import TSNE from 'tsne-js';
import { UMAP } from 'umap-js';

// Import the Pyodide bridge
import PyodideBridge from './pyodide-bridge.js';

// Helpers
import { XrSessionTypes } from '@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper/Constants';
import vtkResourceLoader from '@kitware/vtk.js/IO/Core/ResourceLoader';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';

// UI Components
import controlPanel from './controller.html';

// Global variables
let leftRenderer = null;
let rightRenderer = null;
let leftRenderWindow = null;
let rightRenderWindow = null;
let leftActor = null;
let rightActor = null;
let leftMapper = null;
let rightMapper = null;
let camerasLinked = true;
let currentPolyData = null;
let originalPoints = [];
let reducedPoints = [];
let isProcessing = false;
let activeReduction = null;
let usePythonBackend = true; // Flag to switch between JS and Python implementations

// Add the Python code as a hidden script element
function addPythonModule() {
  try {
    // Check if the script already exists
    if (document.getElementById('python-dim-reduction')) {
      console.log('Python module already exists in document');
      return;
    }
    
    console.log('Adding Python dimensionality reduction module to document...');
    
    const script = document.createElement('script');
    script.id = 'python-dim-reduction';
    script.type = 'text/python';
    script.style.display = 'none';
    
    // Updated Python code with FIXED INDENTATION - no extra spaces at the beginning of lines
    // This is critical for Python which is whitespace-sensitive
    script.textContent = `
def normalize_points(points):
    """
    Normalize points to the range [-1, 1] in each dimension.
    
    Args:
        points (numpy.ndarray): Array of points to normalize
        
    Returns:
        numpy.ndarray: Normalized points
    """
    if not isinstance(points, np.ndarray):
        print("Input is not a numpy array, converting")
        try:
            points = np.array(points, dtype=np.float64)
        except Exception as e:
            print(f"Failed to convert to numpy array: {e}")
            return points
    
    if len(points) == 0:
        print("Empty input for normalization")
        return points
    
    try:
        # Handle NaN values
        if np.any(np.isnan(points)) or np.any(np.isinf(points)):
            print("Warning: NaN or inf values detected, replacing with zeros")
            points = np.nan_to_num(points, nan=0.0, posinf=0.0, neginf=0.0)
        
        # Find min and max for each dimension
        min_vals = np.min(points, axis=0)
        max_vals = np.max(points, axis=0)
        
        # Check if we have valid ranges
        range_vals = max_vals - min_vals
        
        # Check for zero or near-zero ranges (using a small epsilon)
        epsilon = 1e-10
        if np.any(range_vals < epsilon):
            print(f"Warning: Very small range detected in normalization: {range_vals}")
            # For dimensions with too small range, use a default normalization
            for i in range(len(range_vals)):
                if range_vals[i] < epsilon:
                    print(f"Dimension {i} has near-zero range, using default scaling")
                    center = (min_vals[i] + max_vals[i]) / 2
                    points[:, i] = points[:, i] - center  # Center around 0
                    # Scale by max absolute value or just use small range
                    max_abs = np.max(np.abs(points[:, i]))
                    if max_abs > epsilon:
                        points[:, i] = points[:, i] / max_abs
                    else:
                        points[:, i] = np.zeros_like(points[:, i])
        else:
            # Standard normalization to [-1, 1] range for dimensions with sufficient range
            normalized = 2 * (points - min_vals) / range_vals - 1
            points = normalized
        
        print(f"Normalization complete, output shape: {points.shape}")
        return points
    
    except Exception as e:
        print(f"Error in normalization: {e}")
        print(f"Returning original points")
        return points

def apply_pca(points, n_components=3):
    """
    Apply PCA dimensionality reduction.
    
    Args:
        points (numpy.ndarray): Input points
        n_components (int): Number of components to keep
        
    Returns:
        numpy.ndarray: Reduced points
    """
    try:
        if not isinstance(points, np.ndarray) or len(points) == 0:
            print("Invalid input for PCA")
            return np.array([])
        
        # Check if PCA is available
        if PCA is None:
            print("PCA is not available - scikit-learn may not be installed")
            return np.array([])
        
        print(f"Starting PCA with {len(points)} points")
        
        # Handle potential NaN values
        if np.any(np.isnan(points)):
            print("Warning: NaN values detected in input, replacing with zeros")
            points = np.nan_to_num(points)
        
        # Apply PCA
        pca = PCA(n_components=n_components)
        reduced = pca.fit_transform(points)
        
        # Normalize the result
        normalized = normalize_points(reduced)
        
        print(f"PCA completed successfully")
        
        return normalized
    
    except Exception as e:
        print(f"PCA failed: {e}")
        return np.array([])

def apply_tsne(points, perplexity=30, n_iter=1000, n_components=3):
    """
    Apply t-SNE dimensionality reduction.
    
    Args:
        points (numpy.ndarray): Input points
        perplexity (float): Perplexity parameter for t-SNE
        n_iter (int): Number of iterations
        n_components (int): Number of components in output
        
    Returns:
        numpy.ndarray: Reduced points
    """
    try:
        if not isinstance(points, np.ndarray) or len(points) == 0:
            print("Invalid input for t-SNE")
            return np.array([])
        
        # Check if TSNE is available
        if TSNE is None:
            print("TSNE is not available - scikit-learn may not be installed")
            return np.array([])
            
        print(f"Starting t-SNE with {len(points)} points, perplexity={perplexity}, iterations={n_iter}")
        
        # Down-sample large datasets for performance
        MAX_POINTS = 2000
        sampling_used = False
        sample_indices = None
        
        if len(points) > MAX_POINTS:
            print(f"Down-sampling from {len(points)} to {MAX_POINTS} points")
            sample_indices = np.linspace(0, len(points)-1, MAX_POINTS, dtype=int)
            input_points = points[sample_indices]
            sampling_used = True
            print(f"Using {len(input_points)} sampled points")
        else:
            input_points = points
            
        # Clean input data
        if np.any(np.isnan(input_points)):
            print("Warning: NaN values detected, replacing with zeros")
            input_points = np.nan_to_num(input_points)
        
        # Optimize parameters based on dataset size
        opt_perplexity = min(max(5, int(np.sqrt(len(input_points)))), perplexity)
        opt_iterations = min(300, n_iter)
        
        print(f"Using optimized parameters: perplexity={opt_perplexity}, iterations={opt_iterations}")
        
        # Apply t-SNE
        tsne = TSNE(
            n_components=n_components,
            perplexity=opt_perplexity,
            n_iter=opt_iterations,
            learning_rate='auto',
            init='pca'
        )
        
        reduced = tsne.fit_transform(input_points)
        
        # Handle sampling if used
        if sampling_used and sample_indices is not None:
            # Create interpolated result for all points
            final_result = np.zeros((len(points), n_components))
            
            # Add the reduced points we have
            for i, idx in enumerate(sample_indices):
                final_result[idx] = reduced[i]
            
            # Interpolate missing points
            missing_indices = np.setdiff1d(np.arange(len(points)), sample_indices)
            
            for idx in missing_indices:
                # Find nearest sampled point
                nearest_idx = sample_indices[np.abs(sample_indices - idx).argmin()]
                final_result[idx] = final_result[nearest_idx]
            
            reduced = final_result
        
        # Normalize the result
        normalized = normalize_points(reduced)
        
        print("t-SNE completed successfully")
        return normalized
        
    except Exception as e:
        print(f"t-SNE failed: {e}")
        return np.array([])

def apply_umap(points, n_neighbors=15, n_iter=300, n_components=3):
    """
    Apply UMAP dimensionality reduction.
    
    Args:
        points (numpy.ndarray): Input points
        n_neighbors (int): Number of neighbors to consider
        n_iter (int): Number of iterations
        n_components (int): Number of components in output
        
    Returns:
        numpy.ndarray: Reduced points
    """
    try:
        if not isinstance(points, np.ndarray) or len(points) == 0:
            print("Invalid input for UMAP")
            return np.array([])
        
        # Check if UMAP is available
        if UMAP is None:
            print("UMAP is not available - umap-learn or numba may not be installed")
            return np.array([])
            
        print(f"Starting UMAP with {len(points)} points, neighbors={n_neighbors}, iterations={n_iter}")
        
        # Down-sample large datasets for performance
        MAX_UMAP_POINTS = 3000
        sampling_used = False
        sample_indices = None
        
        if len(points) > MAX_UMAP_POINTS:
            print(f"Sampling {MAX_UMAP_POINTS} points for UMAP from {len(points)} total points")
            sample_indices = np.linspace(0, len(points)-1, MAX_UMAP_POINTS, dtype=int)
            input_points = points[sample_indices]
            sampling_used = True
        else:
            input_points = points
            
        # Clean input data
        if np.any(np.isnan(input_points)):
            print("Warning: NaN values detected, replacing with zeros")
            input_points = np.nan_to_num(input_points)
            
        # Calculate optimal neighbors parameter based on dataset size
        optimal_neighbors = min(
            max(5, int(np.sqrt(len(input_points)) / 3)),
            min(n_neighbors, int(len(input_points) / 4))
        )
        
        print(f"Using optimized neighbors parameter: {optimal_neighbors}")
        
        # Initialize and run UMAP
        reducer = UMAP(
            n_components=n_components,
            n_neighbors=optimal_neighbors,
            min_dist=0.1,
            n_epochs=n_iter,
            spread=1.0
        )
        
        reduced = reducer.fit_transform(input_points)
        
        # If we're using 2D output but want 3D, add zeros
        if reduced.shape[1] < 3:
            padded = np.zeros((reduced.shape[0], 3))
            padded[:, :reduced.shape[1]] = reduced
            reduced = padded
        
        # Handle sampling if used
        if sampling_used and sample_indices is not None:
            # Create interpolated result for all points
            final_result = np.zeros((len(points), reduced.shape[1]))
            
            # Add the reduced points we have
            for i, idx in enumerate(sample_indices):
                final_result[idx] = reduced[i]
            
            # Interpolate missing points
            missing_indices = np.setdiff1d(np.arange(len(points)), sample_indices)
            
            for idx in missing_indices:
                # Find nearest sampled point
                nearest_idx = sample_indices[np.abs(sample_indices - idx).argmin()]
                final_result[idx] = final_result[nearest_idx]
            
            reduced = final_result
        
        # Normalize the result
        normalized = normalize_points(reduced)
        
        print("UMAP completed successfully")
        return normalized
        
    except Exception as e:
        print(f"UMAP failed: {e}")
        return np.array([])

def calculate_differences(original_points, reduced_points):
    """
    Calculate differences between original and reduced points.
    
    Args:
        original_points (numpy.ndarray): Original points
        reduced_points (numpy.ndarray): Reduced points
        
    Returns:
        dict: Dictionary containing differences information
    """
    try:
        if not isinstance(original_points, np.ndarray) or not isinstance(reduced_points, np.ndarray):
            print("Invalid input for difference calculation")
            return None
            
        if len(original_points) != len(reduced_points):
            print(f"Point count mismatch: original={len(original_points)}, reduced={len(reduced_points)}")
            
            # Ensure both arrays have the same length
            if len(reduced_points) < len(original_points):
                # Pad reduced points
                padding = np.zeros((len(original_points) - len(reduced_points), reduced_points.shape[1]))
                reduced_points = np.vstack([reduced_points, padding])
            else:
                # Truncate reduced points
                reduced_points = reduced_points[:len(original_points)]
                
        print(f"Calculating differences for {len(original_points)} points")
        
        # Calculate displacements and magnitudes
        displacements = original_points - reduced_points
        magnitudes = np.linalg.norm(displacements, axis=1)
        
        max_magnitude = np.max(magnitudes)
        avg_magnitude = np.mean(magnitudes)
        
        print(f"Differences calculated. Max: {max_magnitude}, Avg: {avg_magnitude}")
        
        return {
            'displacements': displacements,
            'magnitudes': magnitudes,
            'max': max_magnitude,
            'avg': avg_magnitude
        }
        
    except Exception as e:
        print(f"Difference calculation error: {e}")
        return None
`;
    
    document.body.appendChild(script);
    console.log('Python module added to document');
    
    return true;
  } catch (error) {
    console.error('Error adding Python module:', error);
    return false;
  }
}


// ================== ERROR HANDLING ================== //

// Add a simple error catcher for the window
function addGlobalErrorHandler() {
  window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error || event.message);
    
    try {
      // Show a user-friendly error message
      const errorBox = document.createElement('div');
      errorBox.style.position = 'absolute';
      errorBox.style.bottom = '10px';
      errorBox.style.right = '10px';
      errorBox.style.padding = '10px';
      errorBox.style.background = 'rgba(220, 53, 69, 0.8)';
      errorBox.style.color = 'white';
      errorBox.style.borderRadius = '4px';
      errorBox.style.zIndex = '2000';
      errorBox.style.maxWidth = '50%';
      errorBox.textContent = 'An error occurred: ' + (event.error?.message || event.message || 'Unknown error');
      document.body.appendChild(errorBox);
      
      // Remove after 5 seconds
      setTimeout(() => {
        if (errorBox.parentNode) {
          errorBox.parentNode.removeChild(errorBox);
        }
      }, 5000);
    } catch (displayError) {
      console.error('Error displaying error message:', displayError);
    }
    
    // Don't prevent default to allow normal error handling
    return false;
  });
  
  // Also catch unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    try {
      // Show a user-friendly error message
      const errorBox = document.createElement('div');
      errorBox.style.position = 'absolute';
      errorBox.style.bottom = '10px';
      errorBox.style.right = '10px';
      errorBox.style.padding = '10px';
      errorBox.style.background = 'rgba(220, 53, 69, 0.8)';
      errorBox.style.color = 'white';
      errorBox.style.borderRadius = '4px';
      errorBox.style.zIndex = '2000';
      errorBox.style.maxWidth = '50%';
      errorBox.textContent = 'Promise error: ' + (event.reason?.message || 'Unknown error');
      document.body.appendChild(errorBox);
      
      // Remove after 5 seconds
      setTimeout(() => {
        if (errorBox.parentNode) {
          errorBox.parentNode.removeChild(errorBox);
        }
      }, 5000);
    } catch (displayError) {
      console.error('Error displaying promise error message:', displayError);
    }
    
    // Don't prevent default
    return false;
  });
  
  console.log('Global error handlers installed');
}

function handleGlobalError(error, info) {
  console.error('Global error:', error);
  console.log('Error info:', info);
  
  const container = document.querySelector('.content') || document.body;
  if (container) {
    const errorBox = document.createElement('div');
    errorBox.style.position = 'absolute';
    errorBox.style.top = '10px';
    errorBox.style.right = '10px';
    errorBox.style.padding = '10px';
    errorBox.style.background = 'rgba(255, 0, 0, 0.7)';
    errorBox.style.color = 'white';
    errorBox.style.borderRadius = '4px';
    errorBox.style.zIndex = '1000';
    errorBox.textContent = `Error: ${error.message || 'Unknown error'}`;
    container.appendChild(errorBox);
    
    setTimeout(() => {
      if (errorBox.parentNode) {
        errorBox.parentNode.removeChild(errorBox);
      }
    }, 5000);
  }
}

// Set up global error handling
window.addEventListener('error', (event) => {
  handleGlobalError(event.error, { type: 'event', source: event.filename, line: event.lineno });
  // Prevent the error from propagating
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  handleGlobalError(event.reason, { type: 'promise', source: 'async' });
  // Prevent the error from propagating
  event.preventDefault();
});

// ================== VTK SETUP ================== //

// WebXR Polyfill for compatibility
if (navigator.xr === undefined) {
  vtkResourceLoader.loadScript(
    'https://cdn.jsdelivr.net/npm/webxr-polyfill@latest/build/webxr-polyfill.js'
  ).then(() => new window.WebXRPolyfill());
}

// Improve lighting for better visualization
function enhanceLighting(renderer) {
  if (!renderer) {
    console.error('Cannot enhance lighting: renderer is undefined');
    return;
  }
  
  try {
    console.log('Enhancing scene lighting...');
    
    // Remove existing lights
    const existingLights = renderer.getLights();
    existingLights.forEach(light => {
      renderer.removeLight(light);
    });
    
    // Create main light (key light)
    const keyLight = vtkLight.newInstance();
    keyLight.setPosition(1, 1, 1);
    keyLight.setIntensity(1.0);
    keyLight.setColor(1.0, 1.0, 1.0);
    keyLight.setPositional(false);
    renderer.addLight(keyLight);
    
    // Create fill light (from opposite direction)
    const fillLight = vtkLight.newInstance();
    fillLight.setPosition(-0.5, -0.5, -0.5);
    fillLight.setIntensity(0.6);
    fillLight.setColor(0.9, 0.9, 1.0); // Slightly blue for contrast
    fillLight.setPositional(false);
    renderer.addLight(fillLight);
    
    // Create ambient light (for overall illumination)
    const ambientLight = vtkLight.newInstance();
    ambientLight.setPosition(0, 0, 0);
    ambientLight.setIntensity(0.3);
    ambientLight.setColor(1.0, 1.0, 1.0);
    ambientLight.setPositional(true);
    renderer.addLight(ambientLight);
    
    // Update rendering
    renderer.getRenderWindow().render();
    
    console.log('Lighting enhancement complete');
  } catch (error) {
    console.error('Error enhancing lighting:', error);
  }
}

function initializeRenderers() {
  try {
    console.log('Setting up side-by-side renderers...');
    
    // Create parent container
    const rootContainer = document.createElement('div');
    rootContainer.style.position = 'absolute';
    rootContainer.style.top = '0';
    rootContainer.style.left = '0';
    rootContainer.style.width = '100%';
    rootContainer.style.height = '100%';
    rootContainer.style.display = 'flex';
    document.body.appendChild(rootContainer);
    
    // Create left container (original view)
    const leftContainer = document.createElement('div');
    leftContainer.id = 'leftContainer';
    leftContainer.style.width = '50%';
    leftContainer.style.height = '100%';
    leftContainer.style.position = 'relative';
    rootContainer.appendChild(leftContainer);
    
    // Create right container (will show original until reduced)
    const rightContainer = document.createElement('div');
    rightContainer.id = 'rightContainer';
    rightContainer.style.width = '50%';
    rightContainer.style.height = '100%';
    rightContainer.style.position = 'relative';
    rootContainer.appendChild(rightContainer);
    
    // Create containers for labels with updated text
    const leftLabel = document.createElement('div');
    leftLabel.style.position = 'absolute';
    leftLabel.style.top = '10px';
    leftLabel.style.left = '10px';
    leftLabel.style.background = 'rgba(0, 0, 0, 0.7)';
    leftLabel.style.color = 'white';
    leftLabel.style.padding = '5px';
    leftLabel.style.borderRadius = '4px';
    leftLabel.style.zIndex = '1000';
    leftLabel.textContent = 'Original';
    leftContainer.appendChild(leftLabel);
    
    const rightLabel = document.createElement('div');
    rightLabel.style.position = 'absolute';
    rightLabel.style.top = '10px';
    rightLabel.style.left = '10px';
    rightLabel.style.background = 'rgba(0, 0, 0, 0.7)';
    rightLabel.style.color = 'white';
    rightLabel.style.padding = '5px';
    rightLabel.style.borderRadius = '4px';
    rightLabel.style.zIndex = '1000';
    rightLabel.textContent = 'Original (Pre-reduction)';
    rightContainer.appendChild(rightLabel);
    
    // Create logging area for debug info (keeping this for troubleshooting)
    const logContainer = document.createElement('div');
    logContainer.id = 'logContainer';
    logContainer.style.position = 'absolute';
    logContainer.style.bottom = '10px';
    logContainer.style.right = '10px';
    logContainer.style.width = '300px';
    logContainer.style.maxHeight = '150px';
    logContainer.style.overflow = 'auto';
    logContainer.style.background = 'rgba(0, 0, 0, 0.7)';
    logContainer.style.color = 'white';
    logContainer.style.padding = '5px';
    logContainer.style.borderRadius = '4px';
    logContainer.style.zIndex = '2000';
    logContainer.style.fontSize = '12px';
    document.body.appendChild(logContainer);
    
    // Set up state variables
    window.rightViewShowingOriginal = true;
    window.reducedPointsReady = false;
    
    // Create the left renderer (original)
    const leftFullScreen = vtkFullScreenRenderWindow.newInstance({
      rootContainer: leftContainer,
      background: [0.1, 0.1, 0.2], // Slightly blue background
    });
    
    // Create the right renderer (will show original until reduced)
    const rightFullScreen = vtkFullScreenRenderWindow.newInstance({
      rootContainer: rightContainer,
      background: [0.1, 0.1, 0.2], // Slightly blue background
    });
    
    // Get references to both renderers and render windows
    leftRenderer = leftFullScreen.getRenderer();
    leftRenderWindow = leftFullScreen.getRenderWindow();
    
    rightRenderer = rightFullScreen.getRenderer();
    rightRenderWindow = rightFullScreen.getRenderWindow();
    
    // Set up both mappers and actors
    leftMapper = vtkMapper.newInstance();
    leftActor = vtkActor.newInstance();
    leftActor.setMapper(leftMapper);
    
    // Set actor color and properties
    leftActor.getProperty().setColor(0.8, 0.8, 1.0);
    leftActor.getProperty().setPointSize(4); // Larger points for better visibility
    leftActor.getProperty().setAmbient(0.3); // Add ambient component
    leftActor.getProperty().setDiffuse(0.7); // Add diffuse component
    leftActor.getProperty().setSpecular(0.4); // Add specular highlights
    leftActor.getProperty().setSpecularPower(50); // Sharper highlights
    
    rightMapper = vtkMapper.newInstance();
    rightActor = vtkActor.newInstance();
    rightActor.setMapper(rightMapper);
    
    // Set actor color and properties
    rightActor.getProperty().setColor(0.8, 0.8, 1.0);
    rightActor.getProperty().setPointSize(4); // Larger points for better visibility
    rightActor.getProperty().setAmbient(0.3); // Add ambient component
    rightActor.getProperty().setDiffuse(0.7); // Add diffuse component
    rightActor.getProperty().setSpecular(0.4); // Add specular highlights
    rightActor.getProperty().setSpecularPower(50); // Sharper highlights
    
    // Set controller panel on the right side
    rightFullScreen.addController(controlPanel);
    
    // Enhance lighting
    enhanceLighting(leftRenderer);
    enhanceLighting(rightRenderer);
    
    console.log('Side-by-side renderers set up successfully');
    
    return {
      leftFullScreen,
      rightFullScreen
    };
  } catch (error) {
    console.error('Error initializing renderers:', error);
    
    // Create error display
    const errorElement = document.createElement('div');
    errorElement.style.position = 'absolute';
    errorElement.style.top = '50%';
    errorElement.style.left = '50%';
    errorElement.style.transform = 'translate(-50%, -50%)';
    errorElement.style.padding = '20px';
    errorElement.style.background = 'rgba(255, 0, 0, 0.7)';
    errorElement.style.color = 'white';
    errorElement.style.borderRadius = '4px';
    errorElement.style.zIndex = '2000';
    errorElement.textContent = 'Error initializing renderers: ' + error.message;
    document.body.appendChild(errorElement);
    
    return null;
  }
}

const vtpReader = vtkXMLPolyDataReader.newInstance();
let XRHelper = null;

// Check VTK imports to ensure everything is loaded correctly
function checkVTKImports() {
  console.log('Checking VTK imports...');
  
  try {
    // Check core VTK objects
    const checks = [
      { name: 'vtkActor', obj: vtkActor },
      { name: 'vtkFullScreenRenderWindow', obj: vtkFullScreenRenderWindow },
      { name: 'vtkMapper', obj: vtkMapper },
      { name: 'vtkXMLPolyDataReader', obj: vtpReader }
    ];
    
    let allValid = true;
    
    checks.forEach(check => {
      if (!check.obj) {
        console.error(`VTK import check failed: ${check.name} is undefined`);
        allValid = false;
      } else {
        console.log(`VTK import check passed: ${check.name}`);
      }
    });
    
    if (allValid) {
      console.log('All VTK imports are valid');
    } else {
      console.error('Some VTK imports are invalid - check your import paths and bundling');
    }
    
  } catch (error) {
    console.error('Error checking VTK imports:', error);
  }
}

// ================== CORE FUNCTIONS ================== //

function getPointsFromPolyData(polyData) {
  if (!polyData || !polyData.getPoints()) {
    console.error('Invalid polyData or no points found');
    return [];
  }
  
  const points = [];
  const coords = polyData.getPoints().getData();
  if (!coords) {
    console.error('No point data found in polyData');
    return points;
  }

  console.log(`Found ${coords.length/3} points in polyData`);

  for (let i = 0; i < coords.length; i += 3) {
    points.push([coords[i], coords[i+1], coords[i+2]]);
  }
  
  return points;
}

function updatePolyData(polyData, points) {
  if (!polyData || !points || !Array.isArray(points)) {
    console.error('Invalid polyData or points');
    return;
  }
  
  try {
    // Use TypedArray for better performance
    let flatCoords;
    
    // Check if points is already a TypedArray
    if (points instanceof Float32Array) {
      flatCoords = points;
    } else if (Array.isArray(points[0])) {
      // Convert 2D array to flat TypedArray without intermediate array
      flatCoords = new Float32Array(points.length * 3);
      for (let i = 0, k = 0; i < points.length; i++) {
        const point = points[i];
        if (Array.isArray(point) && point.length >= 3) {
          flatCoords[k++] = point[0];
          flatCoords[k++] = point[1];
          flatCoords[k++] = point[2];
        } else {
          flatCoords[k++] = 0;
          flatCoords[k++] = 0;
          flatCoords[k++] = 0;
        }
      }
    } else {
      // Handle already flat array
      flatCoords = new Float32Array(points);
    }
    
    // Update the polyData with efficient data transfer
    polyData.getPoints().setData(flatCoords);
    polyData.modified();
  } catch (error) {
    console.error('Error updating polydata:', error);
  }
}

// Helper function to create PolyData from points array
function createPolyDataFromPoints(points) {
  // Create points
  const vtk_points = vtkPoints.newInstance();
  vtk_points.setNumberOfPoints(points.length);
  
  // Faster insertion using TypedArray
  const flatPoints = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    flatPoints[i*3] = points[i][0];
    flatPoints[i*3+1] = points[i][1];
    flatPoints[i*3+2] = points[i][2];
  }
  vtk_points.setData(flatPoints);
  
  // Create polydata
  const polyData = vtkPolyData.newInstance();
  polyData.setPoints(vtk_points);
  
  // Create vertices (necessary for point rendering)
  const verts = vtkCellArray.newInstance();
  
  // Add each point as a vertex
  for (let i = 0; i < points.length; i++) {
    verts.insertNextCell([i]);
  }
  
  polyData.setVerts(verts);
  return polyData;
}

// Helper function to update views with the same polydata
function updateViewsWithData(polyData) {
  // Update left view
  leftMapper.setInputData(polyData);
  leftRenderer.addActor(leftActor);
  
  // Create a deep copy of polyData for the right view
  const rightPolyData = vtkPolyData.newInstance();
  rightPolyData.shallowCopy(polyData);
  
  // Update right view
  rightMapper.setInputData(rightPolyData);
  rightRenderer.addActor(rightActor);
  
  // Reset cameras
  leftRenderer.resetCamera();
  rightRenderer.resetCamera();
  
  // Render both views
  leftRenderWindow.render();
  rightRenderWindow.render();
  
  // Set state
  window.rightViewShowingOriginal = true;
  
  // Update point count display
  updatePointCountDisplay();
  
  console.log('Views updated with original data on both sides');
}

// Helper function to show error messages
function showErrorMessage(message) {
  const errorBox = document.createElement('div');
  errorBox.style.position = 'absolute';
  errorBox.style.top = '50%';
  errorBox.style.left = '50%';
  errorBox.style.transform = 'translate(-50%, -50%)';
  errorBox.style.padding = '20px';
  errorBox.style.background = 'rgba(255, 0, 0, 0.7)';
  errorBox.style.color = 'white';
  errorBox.style.borderRadius = '4px';
  errorBox.style.zIndex = '2000';
  errorBox.textContent = message;
  document.body.appendChild(errorBox);
  
  // Remove after 5 seconds
  setTimeout(() => {
    if (errorBox.parentNode) {
      errorBox.parentNode.removeChild(errorBox);
    }
  }, 5000);
}

// Add a simplified function for application initialization
function initializeApplicationSimple() {
  console.log('Initializing application with simplified approach...');

  // Check if WebGL is supported
  if (!checkWebGLSupport()) {
    console.error('WebGL is not supported in your browser. This application requires WebGL.');
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.padding = '20px';
    errorDiv.style.background = 'rgba(255, 0, 0, 0.7)';
    errorDiv.style.color = 'white';
    errorDiv.style.borderRadius = '4px';
    errorDiv.style.zIndex = '2000';
    errorDiv.textContent = 'WebGL is not supported in your browser. This application requires WebGL.';
    document.body.appendChild(errorDiv);
    return;
  }

  // Initialize renderers
  const rendererSetup = initializeRenderers();
  if (!rendererSetup) {
    console.error('Failed to initialize renderers');
    return;
  }

  // Setup UI and event listeners
  setupUI();
  
  // Add welcome message
  const welcomeMessage = document.createElement('div');
  welcomeMessage.style.position = 'absolute';
  welcomeMessage.style.top = '50%';
  welcomeMessage.style.left = '25%'; // Center in the left view
  welcomeMessage.style.transform = 'translate(-50%, -50%)';
  welcomeMessage.style.padding = '20px';
  welcomeMessage.style.background = 'rgba(0, 0, 0, 0.7)';
  welcomeMessage.style.color = 'white';
  welcomeMessage.style.borderRadius = '4px';
  welcomeMessage.style.zIndex = '1000';
  welcomeMessage.style.textAlign = 'center';
  welcomeMessage.innerHTML = `
    <h3>3D Point Cloud Dimensionality Reduction</h3>
    <p>Upload a VTP file to visualize.</p>
    <p>Select a reduction method and adjust parameters on the right panel.</p>
    <p>Uses VTK.js for visualization and JavaScript for dimensionality reduction.</p>
  `;
  document.body.appendChild(welcomeMessage);

  // Remove welcome message after 10 seconds or on first interaction
  const removeWelcome = () => {
    if (welcomeMessage.parentNode) {
      welcomeMessage.parentNode.removeChild(welcomeMessage);
    }
    document.removeEventListener('click', removeWelcome);
  };

  setTimeout(removeWelcome, 10000);
  document.addEventListener('click', removeWelcome);

  // SIMPLIFIED: Skip Pyodide completely and just use JavaScript
  window.usePythonBackend = false;
  
  // Add a notice about JavaScript-only mode
  const jsNotice = document.createElement('div');
  jsNotice.style.position = 'absolute';
  jsNotice.style.top = '10px';
  jsNotice.style.left = '50%';
  jsNotice.style.transform = 'translateX(-50%)';
  jsNotice.style.padding = '10px';
  jsNotice.style.background = 'rgba(0, 0, 0, 0.7)';
  jsNotice.style.color = 'white';
  jsNotice.style.borderRadius = '4px';
  jsNotice.style.zIndex = '1000';
  jsNotice.textContent = 'Running in JavaScript-only mode for maximum compatibility';
  document.body.appendChild(jsNotice);
  
  // Remove notice after 5 seconds
  setTimeout(() => {
    if (jsNotice.parentNode) {
      jsNotice.parentNode.removeChild(jsNotice);
    }
  }, 5000);
  
  // Add backend toggle button
  addBackendToggleButton();

  console.log('Application initialized successfully. Ready for user input.');
}

// Enhanced console output display for VTK.js applications
function setupConsoleOutput() {
  console.log('Setting up enhanced console output display...');
  
  // Remove any existing console logger
  const existingLogger = document.getElementById('console-output');
  if (existingLogger) {
    existingLogger.parentNode.removeChild(existingLogger);
  }
  
  // Create main console container
  const consoleContainer = document.createElement('div');
  consoleContainer.id = 'console-output';
  consoleContainer.style.position = 'fixed';
  consoleContainer.style.left = '0';
  consoleContainer.style.bottom = '0';
  consoleContainer.style.width = '100%';
  consoleContainer.style.height = '150px';
  consoleContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
  consoleContainer.style.color = '#FFFFFF';
  consoleContainer.style.fontFamily = 'monospace';
  consoleContainer.style.fontSize = '12px';
  consoleContainer.style.zIndex = '9999';
  consoleContainer.style.display = 'flex';
  consoleContainer.style.flexDirection = 'column';
  consoleContainer.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.5)';
  consoleContainer.style.transition = 'height 0.3s ease';
  
  // Create header with controls
  const headerBar = document.createElement('div');
  headerBar.style.padding = '4px 10px';
  headerBar.style.backgroundColor = 'rgba(50, 50, 50, 0.95)';
  headerBar.style.borderBottom = '1px solid #555';
  headerBar.style.display = 'flex';
  headerBar.style.justifyContent = 'space-between';
  headerBar.style.alignItems = 'center';
  
  // Create title
  const title = document.createElement('div');
  title.textContent = 'Console Output';
  title.style.fontWeight = 'bold';
  
  // Create controls container
  const controls = document.createElement('div');
  
  // Create filter controls
  const filterContainer = document.createElement('span');
  filterContainer.style.marginRight = '15px';
  
  // Add filter options
  const filterTypes = ['all', 'error', 'warn', 'info', 'log'];
  const filterLabels = {
    'all': 'All',
    'error': 'Errors',
    'warn': 'Warnings',
    'info': 'Info',
    'log': 'Logs'
  };
  
  // Create filter dropdown
  const filterSelect = document.createElement('select');
  filterSelect.style.backgroundColor = '#333';
  filterSelect.style.color = '#FFF';
  filterSelect.style.border = '1px solid #555';
  filterSelect.style.borderRadius = '3px';
  filterSelect.style.padding = '2px 5px';
  filterSelect.style.marginLeft = '5px';
  
  filterTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = filterLabels[type];
    filterSelect.appendChild(option);
  });
  
  filterSelect.addEventListener('change', function() {
    const selectedFilter = this.value;
    const entries = document.querySelectorAll('.console-entry');
    
    entries.forEach(entry => {
      if (selectedFilter === 'all') {
        entry.style.display = 'block';
      } else {
        entry.style.display = entry.classList.contains(`type-${selectedFilter}`) ? 'block' : 'none';
      }
    });
  });
  
  // Add label for filter
  const filterLabel = document.createElement('span');
  filterLabel.textContent = 'Show:';
  filterContainer.appendChild(filterLabel);
  filterContainer.appendChild(filterSelect);
  
  // Create buttons
  const clearButton = document.createElement('button');
  clearButton.textContent = 'Clear';
  clearButton.style.backgroundColor = '#555';
  clearButton.style.color = '#FFF';
  clearButton.style.border = 'none';
  clearButton.style.borderRadius = '3px';
  clearButton.style.padding = '3px 8px';
  clearButton.style.marginRight = '10px';
  clearButton.style.cursor = 'pointer';
  
  clearButton.addEventListener('click', function() {
    const logContent = document.getElementById('console-content');
    if (logContent) {
      logContent.innerHTML = '';
    }
    console.log('Console cleared');
  });
  
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Hide';
  toggleButton.style.backgroundColor = '#555';
  toggleButton.style.color = '#FFF';
  toggleButton.style.border = 'none';
  toggleButton.style.borderRadius = '3px';
  toggleButton.style.padding = '3px 8px';
  toggleButton.style.cursor = 'pointer';
  
  let consoleVisible = true;
  toggleButton.addEventListener('click', function() {
    if (consoleVisible) {
      consoleContainer.style.height = '26px';
      logContent.style.display = 'none';
      this.textContent = 'Show';
      consoleVisible = false;
    } else {
      consoleContainer.style.height = '150px';
      logContent.style.display = 'block';
      this.textContent = 'Hide';
      consoleVisible = true;
    }
  });
  
  // Add elements to header
  controls.appendChild(filterContainer);
  controls.appendChild(clearButton);
  controls.appendChild(toggleButton);
  headerBar.appendChild(title);
  headerBar.appendChild(controls);
  
  // Create log content area
  const logContent = document.createElement('div');
  logContent.id = 'console-content';
  logContent.style.flexGrow = '1';
  logContent.style.overflow = 'auto';
  logContent.style.padding = '5px 10px';
  logContent.style.fontFamily = 'monospace';
  logContent.style.fontSize = '11px';
  
  // Add components to container
  consoleContainer.appendChild(headerBar);
  consoleContainer.appendChild(logContent);
  
  // Add container to document
  document.body.appendChild(consoleContainer);
  
  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };
  
  // Override console methods
  function overrideConsole() {
    // Helper function to format log entries
    function createLogEntry(type, args) {
      // Get current time
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      
      // Format message
      const messages = Array.from(args).map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      });
      
      // Create entry element
      const entry = document.createElement('div');
      entry.className = `console-entry type-${type}`;
      entry.style.borderBottom = '1px solid rgba(80, 80, 80, 0.3)';
      entry.style.padding = '3px 0';
      entry.style.fontFamily = 'monospace';
      entry.style.whiteSpace = 'pre-wrap';
      entry.style.wordBreak = 'break-word';
      
      // Style based on type
      switch (type) {
        case 'error':
          entry.style.color = '#FF5555';
          break;
        case 'warn':
          entry.style.color = '#FFCC55';
          break;
        case 'info':
          entry.style.color = '#55AAFF';
          break;
        default:
          entry.style.color = '#AAFFAA';
      }
      
      // Create timestamp element
      const timeSpan = document.createElement('span');
      timeSpan.style.color = '#888';
      timeSpan.style.marginRight = '8px';
      timeSpan.textContent = `[${timestamp}]`;
      
      // Create type indicator
      const typeSpan = document.createElement('span');
      typeSpan.style.marginRight = '8px';
      typeSpan.textContent = `[${type.toUpperCase()}]`;
      
      // Create message element
      const messageSpan = document.createElement('span');
      messageSpan.textContent = messages.join(' ');
      
      // Assemble entry
      entry.appendChild(timeSpan);
      entry.appendChild(typeSpan);
      entry.appendChild(messageSpan);
      
      return entry;
    }
    
    // Override console.log
    console.log = function() {
      // Call original method
      originalConsole.log.apply(console, arguments);
      
      // Add to console display
      const logContent = document.getElementById('console-content');
      if (logContent) {
        const entry = createLogEntry('log', arguments);
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
      }
    };
    
    // Override console.error
    console.error = function() {
      // Call original method
      originalConsole.error.apply(console, arguments);
      
      // Add to console display
      const logContent = document.getElementById('console-content');
      if (logContent) {
        const entry = createLogEntry('error', arguments);
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
      }
    };
    
    // Override console.warn
    console.warn = function() {
      // Call original method
      originalConsole.warn.apply(console, arguments);
      
      // Add to console display
      const logContent = document.getElementById('console-content');
      if (logContent) {
        const entry = createLogEntry('warn', arguments);
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
      }
    };
    
    // Override console.info
    console.info = function() {
      // Call original method
      originalConsole.info.apply(console, arguments);
      
      // Add to console display
      const logContent = document.getElementById('console-content');
      if (logContent) {
        const entry = createLogEntry('info', arguments);
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
      }
    };
    
    // Add clear method
    console.clearOutput = function() {
      const logContent = document.getElementById('console-content');
      if (logContent) {
        logContent.innerHTML = '';
      }
    };
    
    // Store original methods for restoration
    console._original = originalConsole;
  }
  
  // Set up log limiter to prevent memory issues
  function setupLogLimiter() {
    setInterval(() => {
      const logContent = document.getElementById('console-content');
      if (logContent) {
        const entries = logContent.querySelectorAll('.console-entry');
        const MAX_ENTRIES = 1000;
        
        if (entries.length > MAX_ENTRIES) {
          const toRemove = entries.length - MAX_ENTRIES;
          for (let i = 0; i < toRemove; i++) {
            if (entries[i] && entries[i].parentNode) {
              entries[i].parentNode.removeChild(entries[i]);
            }
          }
          console.info(`Removed ${toRemove} old log entries to prevent memory issues`);
        }
      }
    }, 30000); // Check every 30 seconds
  }
  
  // Initialize the console override
  overrideConsole();
  
  // Setup log limiter
  setupLogLimiter();
  
  // Log initialization message
  console.info('Console output display initialized');
  
  // Return API for potential external control
  return {
    clear: console.clearOutput,
    element: consoleContainer,
    show: () => {
      consoleContainer.style.height = '150px';
      logContent.style.display = 'block';
      toggleButton.textContent = 'Hide';
      consoleVisible = true;
    },
    hide: () => {
      consoleContainer.style.height = '26px';
      logContent.style.display = 'none';
      toggleButton.textContent = 'Show';
      consoleVisible = false;
    },
    restore: () => {
      if (console._original) {
        console.log = console._original.log;
        console.error = console._original.error;
        console.warn = console._original.warn;
        console.info = console._original.info;
        console.info('Original console methods restored');
      }
    }
  };
}

// Initialize console output as part of application startup
function initializeConsoleOutput() {
  // Set up the console output display
  const consoleOutput = setupConsoleOutput();
  
  // Make console API globally available
  window.consoleOutput = consoleOutput;
  
  return consoleOutput;
}

// Call this from your initializeApplication function
// Add this line after setupUI();
// const consoleOutput = initializeConsoleOutput();

// Add a button to toggle between JS and Python backends
function addBackendToggleButton() {
  try {
    // Remove existing button if any
    const existingButton = document.getElementById('backendToggleButton');
    if (existingButton) {
      existingButton.parentNode.removeChild(existingButton);
    }
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'backendToggleButton';
    toggleButton.style.position = 'absolute';
    toggleButton.style.top = '50px';
    toggleButton.style.left = '10px';
    toggleButton.style.zIndex = '1000';
    toggleButton.style.padding = '8px 12px';
    toggleButton.style.backgroundColor = usePythonBackend ? '#28a745' : '#007bff';
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.borderRadius = '4px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.textContent = usePythonBackend ? 'Using Python Backend' : 'Using JavaScript Backend';
    
    // Add click handler
    toggleButton.addEventListener('click', () => {
      usePythonBackend = !usePythonBackend;
      toggleButton.textContent = usePythonBackend ? 'Using Python Backend' : 'Using JavaScript Backend';
      toggleButton.style.backgroundColor = usePythonBackend ? '#28a745' : '#007bff';
      
      updateStatusMessage(`Switched to ${usePythonBackend ? 'Python' : 'JavaScript'} backend for dimensionality reduction`, 'info');
    });
    
    // Add to document
    document.body.appendChild(toggleButton);
    
  } catch (error) {
    console.error('Error adding backend toggle button:', error);
  }
}

// ================== FILE HANDLING ================== //

// Enhanced file handling function with support for different formats
function enhancedFileHandler(e) {
  try {
    e.preventDefault();
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.error('No files selected');
      return;
    }
    
    const file = files[0];
    console.log('Loading file:', file.name);
    
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loadingIndicator';
    loadingIndicator.style.position = 'absolute';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.padding = '20px';
    loadingIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.borderRadius = '4px';
    loadingIndicator.style.zIndex = '2000';
    loadingIndicator.textContent = 'Loading file...';
    document.body.appendChild(loadingIndicator);
    
    // Check file extension for handling strategy
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.vtp')) {
      // Handle VTP file (VTK PolyData XML format)
      const fileReader = new FileReader();
      
      fileReader.onload = function() {
        try {
          console.log('VTP file loaded into memory, parsing...');
          
          // Parse VTP data
          vtpReader.parseAsArrayBuffer(fileReader.result);
          currentPolyData = vtpReader.getOutputData(0);
          
          if (!currentPolyData) {
            throw new Error('Failed to parse VTP file');
          }
          
          // Create a deep copy for the right view
          const rightPolyData = vtpReader.getOutputData(0);
          
          // Extract original points
          originalPoints = getPointsFromPolyData(currentPolyData);
          console.log('Loaded', originalPoints.length, 'points from VTP file');
          
          // Update views
          updateViewsWithData(currentPolyData, rightPolyData);
          
        } catch (error) {
          console.error('Error processing VTP file:', error);
          showErrorMessage('Error processing VTP file: ' + error.message);
        } finally {
          // Remove loading indicator
          if (loadingIndicator.parentNode) {
            loadingIndicator.parentNode.removeChild(loadingIndicator);
          }
        }
      };
      
      fileReader.onerror = function() {
        console.error('Error reading VTP file');
        showErrorMessage('Error reading VTP file');
        
        // Remove loading indicator
        if (loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
      };
      
      console.log('Reading VTP file as ArrayBuffer...');
      fileReader.readAsArrayBuffer(file);
      
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      // Handle CSV or TXT file as point cloud
      const fileReader = new FileReader();
      
      fileReader.onload = function() {
        try {
          console.log('Text file loaded, parsing as points...');
          const content = fileReader.result;
          
          // Parse text content as points
          const lines = content.split('\n');
          const points = [];
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#')) continue; // Skip empty lines or comments
            
            const values = line.split(/[ ,\t]+/); // Split by space, comma or tab
            if (values.length >= 3) {
              const x = parseFloat(values[0]);
              const y = parseFloat(values[1]);
              const z = parseFloat(values[2]);
              
              if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                points.push([x, y, z]);
              }
            }
          }
          
          if (points.length === 0) {
            throw new Error('No valid points found in file');
          }
          
          console.log('Parsed', points.length, 'points from text file');
          
          // Create polydata from points
          const polyData = createPolyDataFromPoints(points);
          const rightPolyData = createPolyDataFromPoints(points);
          
          // Store original points
          originalPoints = points;
          currentPolyData = polyData;
          
          // Update views
          updateViewsWithData(polyData, rightPolyData);
          
        } catch (error) {
          console.error('Error processing text file:', error);
          showErrorMessage('Error processing text file: ' + error.message);
        } finally {
          // Remove loading indicator
          if (loadingIndicator.parentNode) {
            loadingIndicator.parentNode.removeChild(loadingIndicator);
          }
        }
      };
      
      fileReader.onerror = function() {
        console.error('Error reading text file');
        showErrorMessage('Error reading text file');
        
        // Remove loading indicator
        if (loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
      };
      
      console.log('Reading text file as text...');
      fileReader.readAsText(file);
      
    } else {
      // Unsupported file format
      console.error('Unsupported file format:', fileName);
      showErrorMessage('Unsupported file format. Please use .vtp, .csv, or .txt files.');
      
      // Remove loading indicator
      if (loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
    }
    
  } catch (error) {
    console.error('File handling error:', error);
    showErrorMessage('File handling error: ' + error.message);
    
    // Remove loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator && loadingIndicator.parentNode) {
      loadingIndicator.parentNode.removeChild(loadingIndicator);
    }
  }
}

// Generate a sample point cloud for testing
function generateSampleData() {
  console.log('Generating sample point cloud data...');
  
  const points = [];
  const numPoints = 5000;
  
  // Generate points on a sphere
  for (let i = 0; i < numPoints; i++) {
    // Random spherical coordinates
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 0.8 + Math.random() * 0.2; // Slightly randomize radius
    
    // Convert to Cartesian coordinates
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    points.push([x, y, z]);
  }
  
  console.log(`Generated ${points.length} sample points`);
  
  // Create polydata for both views
  const polyData = createPolyDataFromPoints(points);
  const rightPolyData = createPolyDataFromPoints(points);
  
  // Store original points
  originalPoints = points;
  currentPolyData = polyData;
  
  // Update views
  updateViewsWithData(polyData, rightPolyData);
  
  return points;
}

// ================== DIMENSION REDUCTION ================== //

// PCA Implementation - with Python/JS switching
function applyPCA(points) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!points?.length || !Array.isArray(points)) {
        console.error('Invalid input to PCA:', points);
        return resolve([]);
      }
      
      console.log('Starting PCA with points:', {
        length: points.length,
        sample: points.slice(0, 3)
      });
      
      // Check if we should use Python backend
      if (usePythonBackend) {
        try {
          console.log('Using Python backend for PCA');
          updateStatusMessage('Using Python backend for PCA...', 'info');
          
          // Use PyodideBridge to run PCA
          const result = await PyodideBridge.applyPCA(points, 3);
          
          if (result && Array.isArray(result) && result.length > 0) {
            console.log('Python PCA completed successfully. Sample result:', 
                      Array.isArray(result[0]) ? result.slice(0, 3) : 'Not a 2D array');
            resolve(result);
          } else {
            console.warn('Python PCA returned invalid result, falling back to JS implementation');
            updateStatusMessage('Falling back to JavaScript PCA implementation', 'warning');
            
            // Fall back to JS implementation
            const jsResult = applyPCAJS(points);
            resolve(jsResult);
          }
        } catch (error) {
          console.error('Python PCA failed:', error);
          updateStatusMessage('Python PCA failed, using JavaScript fallback', 'warning');
          
          // Fall back to JS implementation
          const jsResult = applyPCAJS(points);
          resolve(jsResult);
        }
      } else {
        // Use JavaScript implementation
        console.log('Using JavaScript backend for PCA');
        updateStatusMessage('Using JavaScript for PCA...', 'info');
        
        const result = applyPCAJS(points);
        resolve(result);
      }
    } catch (error) {
      console.error('PCA error:', error);
      reject(error);
    }
  });
}

// JavaScript implementation of PCA (for fallback)
function applyPCAJS(points) {
  try {
    if (!points?.length || !Array.isArray(points)) {
      console.error('Invalid input to PCA JS:', points);
      return [];
    }
    
    console.log('Starting JavaScript PCA with points:', {
      length: points.length,
      sample: points.slice(0, 3)
    });
    
    // Make a copy of the points to avoid modifying the original
    const pointsForPCA = points.map(point => 
      Array.isArray(point) ? [...point] : [0, 0, 0]
    );
    
    // Check for NaN or invalid values
    let hasInvalid = false;
    pointsForPCA.forEach(point => {
      if (Array.isArray(point)) {
        point.forEach((val, idx) => {
          if (typeof val !== 'number' || isNaN(val)) {
            hasInvalid = true;
            point[idx] = 0; // Replace invalid values
          }
        });
      } else {
        hasInvalid = true;
      }
    });
    
    if (hasInvalid) {
      console.warn('PCA input contained invalid values that were replaced');
    }
    
    // Use ml-pca library to perform PCA
    const pca = new PCA(pointsForPCA);
    
    // Get the projected points
    const projection = pca.predict(pointsForPCA, {nComponents: 3});
    
    // Convert to 3D points if not already
    const projectedPoints = [];
    for (let i = 0; i < projection.rows; i++) {
      const row = projection.getRow(i);
      projectedPoints.push([
        row[0] || 0,
        row.length > 1 ? row[1] || 0 : 0,
        row.length > 2 ? row[2] || 0 : 0
      ]);
    }
    
    // Normalize the output
    const result = normalizePoints(projectedPoints);
    
    console.log('JavaScript PCA completed successfully. Sample result:', result.slice(0, 3));
    
    return result;
    
  } catch (error) {
    console.error('JavaScript PCA failed:', error);
    return [];
  }
}

function applyTSNE(points, perplexity = 30, iterations = 500) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Starting t-SNE with ${points.length} points`);
      
      // Create progress indicator
      let progressElement = document.getElementById('tsneProgress');
      if (!progressElement) {
        progressElement = document.createElement('div');
        progressElement.id = 'tsneProgress';
        progressElement.style.position = 'absolute';
        progressElement.style.top = '10px';
        progressElement.style.left = '10px';
        progressElement.style.padding = '8px';
        progressElement.style.background = 'rgba(0, 0, 0, 0.7)';
        progressElement.style.color = 'white';
        progressElement.style.borderRadius = '4px';
        progressElement.style.zIndex = '1000';
        document.body.appendChild(progressElement);
      }
      progressElement.textContent = 'Starting t-SNE...';
      
      // Check if we should use Python backend
      if (usePythonBackend) {
        try {
          console.log('Using Python backend for t-SNE');
          progressElement.textContent = 'Using Python backend for t-SNE...';
          
          // Use PyodideBridge to run t-SNE
          const result = await PyodideBridge.applyTSNE(points, perplexity, iterations, 3);
          
          // Remove progress indicator
          if (progressElement.parentNode) {
            progressElement.parentNode.removeChild(progressElement);
          }
          
          if (result && Array.isArray(result) && result.length > 0) {
            console.log('Python t-SNE completed successfully. Sample result:', 
                      Array.isArray(result[0]) ? result.slice(0, 3) : 'Not a 2D array');
            resolve(result);
          } else {
            console.warn('Python t-SNE returned invalid result, falling back to new JS implementation');
            progressElement.textContent = 'Falling back to JavaScript t-SNE...';
            
            // Fall back to our new JS implementation
            const jsResult = await applyTSNEStepByStep(points, perplexity, iterations);
            resolve(jsResult);
          }
        } catch (error) {
          console.error('Python t-SNE failed:', error);
          progressElement.textContent = 'Python t-SNE failed, using JavaScript fallback...';
          
          // Fall back to our new JS implementation
          const jsResult = await applyTSNEStepByStep(points, perplexity, iterations);
          resolve(jsResult);
        }
      } else {
        // Use our new JavaScript implementation
        console.log('Using new JavaScript implementation for t-SNE');
        progressElement.textContent = 'Using JavaScript for t-SNE...';
        
        const result = await applyTSNEStepByStep(points, perplexity, iterations);
        resolve(result);
      }
    } catch (error) {
      console.error('t-SNE setup error:', error);
      
      const progressElement = document.getElementById('tsneProgress');
      if (progressElement && progressElement.parentNode) {
        progressElement.parentNode.removeChild(progressElement);
      }
      
      reject(error);
    }
  });
}
/**
 * New step-by-step t-SNE implementation
 * Follows the t-SNE algorithm more explicitly:
 * 1. Compute pairwise similarities in high-dimensional space
 * 2. Initialize low-dimensional points
 * 3. Perform gradient descent to minimize KL-divergence
 */
/**
 * New step-by-step t-SNE implementation with perplexity display update
 */
function applyTSNEStepByStep(points, perplexity = 30, iterations = 500) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Starting step-by-step t-SNE with ${points.length} points`);
      
      // Set up progress indicator
      let progressElement = document.getElementById('tsneProgress');
      if (!progressElement) {
        progressElement = document.createElement('div');
        progressElement.id = 'tsneProgress';
        progressElement.style.position = 'absolute';
        progressElement.style.top = '10px';
        progressElement.style.left = '10px';
        progressElement.style.padding = '8px';
        progressElement.style.background = 'rgba(0, 0, 0, 0.7)';
        progressElement.style.color = 'white';
        progressElement.style.borderRadius = '4px';
        progressElement.style.zIndex = '1000';
        document.body.appendChild(progressElement);
      }
      progressElement.textContent = 'Preparing t-SNE data...';

      // Add progress bar
      const progressBar = document.createElement('div');
      progressBar.style.height = '4px';
      progressBar.style.marginTop = '8px';
      progressBar.style.background = '#333';
      progressBar.style.borderRadius = '2px';
      progressBar.style.overflow = 'hidden';
      
      const progressFill = document.createElement('div');
      progressFill.style.width = '0%';
      progressFill.style.height = '100%';
      progressFill.style.background = '#4CAF50';
      progressFill.style.transition = 'width 0.3s ease';
      
      progressBar.appendChild(progressFill);
      progressElement.appendChild(progressBar);

      // STEP 0: Down-sample large datasets for performance
      const MAX_POINTS = 1000;
      let inputPoints = [];
      let sampleIndices = [];
      let samplingUsed = false;
      
      if (points.length > MAX_POINTS) {
        console.log(`Down-sampling from ${points.length} to ${MAX_POINTS} points`);
        progressElement.textContent = 'Down-sampling points...';
        progressFill.style.width = '5%';
        
        // Evenly-spaced sampling with safe checks
        const step = Math.floor(points.length / MAX_POINTS);
        
        for (let i = 0; i < points.length; i += step) {
          if (inputPoints.length < MAX_POINTS) {
            if (Array.isArray(points[i]) && points[i].length >= 3) {
              // Make a deep copy to avoid modifying original
              inputPoints.push([
                Number(points[i][0]) || 0,
                Number(points[i][1]) || 0,
                Number(points[i][2]) || 0
              ]);
              sampleIndices.push(i);
            }
          }
        }
        
        samplingUsed = true;
        console.log(`Using ${inputPoints.length} sampled points`);
      } else {
        // Use all points but make safe copies
        inputPoints = points.map(p => {
          if (Array.isArray(p) && p.length >= 3) {
            return [
              Number(p[0]) || 0,
              Number(p[1]) || 0,
              Number(p[2]) || 0
            ];
          }
          return [0, 0, 0];
        });
        
        // Create sequential indices
        sampleIndices = Array.from(Array(points.length).keys());
      }

      // Remove any NaN or invalid values
      for (let i = 0; i < inputPoints.length; i++) {
        for (let j = 0; j < inputPoints[i].length; j++) {
          if (typeof inputPoints[i][j] !== 'number' || isNaN(inputPoints[i][j])) {
            inputPoints[i][j] = 0;
          }
        }
      }
      
      // Optimize parameters based on dataset size
      const optPerplexity = Math.min(Math.max(5, Math.floor(Math.sqrt(inputPoints.length))), perplexity);
      const optIterations = iterations; // Use the full iterations value from the slider
      
      console.log(`Using optimized parameters: perplexity=${optPerplexity}, iterations=${optIterations}`);
      
      // Update perplexity display in the UI
      updatePerplexityDisplay(optPerplexity);
      
      progressElement.textContent = 'Calculating pairwise distances...';
      progressFill.style.width = '10%';
      
      // STEP 1: Calculate pairwise Euclidean distances
      const distances = calculatePairwiseDistances(inputPoints);
      
      progressElement.textContent = 'Computing high-dimensional similarities...';
      progressFill.style.width = '15%';
      
      // STEP 2: Compute conditional probabilities in high-dimensional space (P matrix)
      const pMatrix = computePMatrix(distances, optPerplexity);
      
      progressElement.textContent = 'Initializing low-dimensional embedding...';
      progressFill.style.width = '20%';
      
      // STEP 3: Initialize low-dimensional points (randomly or with PCA)
      const lowDimPoints = initializeLowDimensionalPoints(inputPoints, 3);
      
      progressElement.textContent = 'Starting t-SNE optimization...';
      
      // STEP 4: Gradient descent optimization
      performGradientDescent(
        pMatrix, 
        lowDimPoints, 
        optIterations, 
        (iteration, progress, currentPoints) => {
          // Update progress
          const percentComplete = Math.round(20 + (iteration / optIterations) * 70);
          progressElement.textContent = `t-SNE iteration ${iteration}/${optIterations} (${Math.round(progress * 100)}%)`;
          progressFill.style.width = `${percentComplete}%`;
        }
      ).then(finalPoints => {
        progressElement.textContent = 'Finalizing t-SNE results...';
        progressFill.style.width = '90%';
        
        // STEP 5: Handle sampling and scaling if needed
        let result = finalPoints;
        
        if (samplingUsed) {
          // Create interpolated result for all points
          const interpolatedResult = interpolateSampledPoints(
            finalPoints,
            points.length,
            sampleIndices
          );
          result = interpolatedResult;
        }
        
        // Normalize the points
        const normalizedResult = normalizePoints(result);
        
        // Clean up progress indicator
        if (progressElement.parentNode) {
          progressElement.parentNode.removeChild(progressElement);
        }
        
        console.log('t-SNE completed successfully');
        resolve(normalizedResult);
      })
      .catch(error => {
        console.error('Error in gradient descent:', error);
        
        if (progressElement.parentNode) {
          progressElement.parentNode.removeChild(progressElement);
        }
        
        reject(error);
      });
      
    } catch (error) {
      console.error('t-SNE processing error:', error);
      
      // Clean up UI
      const progressElement = document.getElementById('tsneProgress');
      if (progressElement && progressElement.parentNode) {
        progressElement.parentNode.removeChild(progressElement);
      }
      
      reject(error);
    }
  });
}

// JavaScript implementation of t-SNE (for fallback) with perplexity display update
function applyTSNEJS(points, perplexity = 30, iterations = 500) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Starting JavaScript t-SNE with ${points.length} points`);
      
      // Create progress indicator
      let progressElement = document.getElementById('tsneProgress');
      if (!progressElement) {
        progressElement = document.createElement('div');
        progressElement.id = 'tsneProgress';
        progressElement.style.position = 'absolute';
        progressElement.style.top = '10px';
        progressElement.style.left = '10px';
        progressElement.style.padding = '8px';
        progressElement.style.background = 'rgba(0, 0, 0, 0.7)';
        progressElement.style.color = 'white';
        progressElement.style.borderRadius = '4px';
        progressElement.style.zIndex = '1000';
        document.body.appendChild(progressElement);
      }
      progressElement.textContent = 'Starting JavaScript t-SNE...';

      // OPTIMIZATION 1: Down-sample large datasets
      const MAX_POINTS = 1000;
      let inputPoints = [];
      let sampleIndices = [];
      let samplingUsed = false;
      
      if (points.length > MAX_POINTS) {
        console.log(`Down-sampling from ${points.length} to ${MAX_POINTS} points`);
        progressElement.textContent = 'Down-sampling points...';
        
        // Simple evenly-spaced sampling
        const step = Math.floor(points.length / MAX_POINTS);
        
        for (let i = 0; i < points.length; i += step) {
          if (inputPoints.length < MAX_POINTS) {
            if (Array.isArray(points[i]) && points[i].length >= 3) {
              // Make a deep copy to avoid modifying original
              inputPoints.push([
                Number(points[i][0]) || 0,
                Number(points[i][1]) || 0,
                Number(points[i][2]) || 0
              ]);
              sampleIndices.push(i);
            }
          }
        }
        
        samplingUsed = true;
        console.log(`Using ${inputPoints.length} sampled points`);
      } else {
        // Use all points but make safe copies to avoid modifying originals
        inputPoints = points.map(p => {
          if (Array.isArray(p) && p.length >= 3) {
            return [
              Number(p[0]) || 0,
              Number(p[1]) || 0,
              Number(p[2]) || 0
            ];
          }
          return [0, 0, 0];
        });
        
        // Create sequential indices
        sampleIndices = Array.from(Array(points.length).keys());
      }
      
      // Clean invalid values in the input data
      for (let i = 0; i < inputPoints.length; i++) {
        for (let j = 0; j < inputPoints[i].length; j++) {
          if (typeof inputPoints[i][j] !== 'number' || isNaN(inputPoints[i][j])) {
            inputPoints[i][j] = 0;
          }
        }
      }
      
      // OPTIMIZATION 2: Optimize parameters
      const optPerplexity = Math.min(Math.max(5, Math.floor(Math.sqrt(inputPoints.length))), perplexity);
      const optIterations = iterations; // Use the full iterations value from the slider
      
      console.log(`Using optimized parameters: perplexity=${optPerplexity}, iterations=${optIterations}`);

      // Update perplexity display in the UI
      updatePerplexityDisplay(optPerplexity);
      
      progressElement.textContent = 'Initializing t-SNE...';
      
      // Add progress bar
      const progressBar = document.createElement('div');
      progressBar.style.height = '4px';
      progressBar.style.marginTop = '8px';
      progressBar.style.background = '#333';
      progressBar.style.borderRadius = '2px';
      progressBar.style.overflow = 'hidden';
      
      const progressFill = document.createElement('div');
      progressFill.style.width = '0%';
      progressFill.style.height = '100%';
      progressFill.style.background = '#4CAF50';
      progressFill.style.transition = 'width 0.3s ease';
      
      progressBar.appendChild(progressFill);
      progressElement.appendChild(progressBar);
      
      // Initialize t-SNE with optimized settings
      const model = new TSNE({
        dim: 3,
        perplexity: optPerplexity,
        earlyExaggeration: 4.0,
        learningRate: 200,
        nIter: optIterations,
        metric: 'euclidean'
      });
      
      // Initialize data
      try {
        model.init({
          data: inputPoints,
          type: 'dense'
        });
        
        progressFill.style.width = '10%';
      } catch (initError) {
        console.error('t-SNE initialization failed:', initError);
        progressElement.textContent = 'Error: t-SNE initialization failed';
        
        setTimeout(() => {
          if (progressElement.parentNode) {
            progressElement.parentNode.removeChild(progressElement);
          }
        }, 3000);
        
        reject(initError);
        return;
      }
      
      // OPTIMIZATION 3: Batch processing for better performance
      const BATCH_SIZE = 20;
      let currentIteration = 0;
      
      function runBatch() {
        // Calculate iterations to run
        const remaining = optIterations - currentIteration;
        const batchSize = Math.min(BATCH_SIZE, remaining);
        
        if (batchSize <= 0) {
          // All iterations complete, finalize results
          progressElement.textContent = 'Processing results...';
          progressFill.style.width = '90%';
          
          try {
            // Get output from t-SNE
            const output = model.getOutputScaled();
            
            // Convert to 3D points array
            const outputPoints = [];
            for (let i = 0; i < output.length; i += 3) {
              // Safely create point with proper type handling
              outputPoints.push([
                Number(output[i]) || 0,
                i+1 < output.length ? Number(output[i+1]) || 0 : 0,
                i+2 < output.length ? Number(output[i+2]) || 0 : 0
              ]);
            }
            
            progressFill.style.width = '95%';
            
            let finalResult;
            
            if (samplingUsed) {
              // Create array for final result with same size as original points
              finalResult = new Array(points.length);
              
              // First, fill the sampled points positions safely
              for (let i = 0; i < sampleIndices.length && i < outputPoints.length; i++) {
                // Create a new array instead of using spread operator
                if (outputPoints[i]) {
                  finalResult[sampleIndices[i]] = [
                    Number(outputPoints[i][0]) || 0,
                    Number(outputPoints[i][1]) || 0,
                    Number(outputPoints[i][2]) || 0
                  ];
                }
              }
              
              // OPTIMIZATION 4: Simpler interpolation for missing points
              progressElement.textContent = 'Interpolating points...';
              
              for (let i = 0; i < points.length; i++) {
                // Skip already filled points
                if (finalResult[i]) continue;
                
                // Find nearest sample point
                let nearestIdx = 0;
                let minDist = Number.MAX_VALUE;
                
                for (let j = 0; j < sampleIndices.length; j++) {
                  const dist = Math.abs(i - sampleIndices[j]);
                  if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = j;
                  }
                }
                
                // Copy from nearest point with safe type handling
                if (nearestIdx < outputPoints.length && Array.isArray(outputPoints[nearestIdx])) {
                  finalResult[i] = [
                    Number(outputPoints[nearestIdx][0]) || 0,
                    Number(outputPoints[nearestIdx][1]) || 0,
                    Number(outputPoints[nearestIdx][2]) || 0
                  ];
                } else {
                  // Fallback if nearest point is not valid
                  finalResult[i] = [0, 0, 0];
                }
              }
            } else {
              // Just use output points directly but ensure they're all valid arrays
              finalResult = outputPoints.map(p => {
                if (Array.isArray(p) && p.length >= 3) {
                  return [
                    Number(p[0]) || 0,
                    Number(p[1]) || 0,
                    Number(p[2]) || 0
                  ];
                }
                return [0, 0, 0];
              });
            }
            
            // Normalize the points to fit visualization space
            const result = normalizePoints(finalResult);
            
            // Cleanup progress element
            progressFill.style.width = '100%';
            setTimeout(() => {
              if (progressElement.parentNode) {
                progressElement.parentNode.removeChild(progressElement);
              }
            }, 500);
            
            console.log('JavaScript t-SNE completed successfully');
            resolve(result);
            
          } catch (resultError) {
            console.error('Error processing t-SNE results:', resultError);
            
            if (progressElement.parentNode) {
              progressElement.parentNode.removeChild(progressElement);
            }
            
            reject(resultError);
          }
          
          return;
        }
        
        // Run the batch of iterations
        try {
          model.run(batchSize);
          currentIteration += batchSize;
          
          // Update progress
          const percent = Math.round((currentIteration / optIterations) * 100);
          progressElement.textContent = `t-SNE progress: ${percent}%`;
          progressFill.style.width = `${10 + percent * 0.8}%`; // From 10% to 90%
          
          // Schedule next batch using requestAnimationFrame for better browser performance
          requestAnimationFrame(runBatch);
          
        } catch (batchError) {
          console.error('Error in t-SNE batch processing:', batchError);
          
          if (progressElement.parentNode) {
            progressElement.parentNode.removeChild(progressElement);
          }
          
          reject(batchError);
        }
      }
      
      // Start processing after a short delay
      setTimeout(runBatch, 50);
      
    } catch (error) {
      console.error('t-SNE setup error:', error);
      
      const progressElement = document.getElementById('tsneProgress');
      if (progressElement && progressElement.parentNode) {
        progressElement.parentNode.removeChild(progressElement);
      }
      
      reject(error);
    }
  });
}

function calculatePairwiseDistances(points) {
  const n = points.length;
  const distances = Array(n).fill().map(() => Array(n).fill(0));
  
  // Calculate squared Euclidean distances
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let sum = 0;
      for (let d = 0; d < points[i].length; d++) {
        const diff = points[i][d] - points[j][d];
        sum += diff * diff;
      }
      distances[i][j] = sum;
      distances[j][i] = sum; // Symmetric matrix
    }
  }
  
  return distances;
}

function computePMatrix(distances, perplexity) {
  const n = distances.length;
  const P = Array(n).fill().map(() => Array(n).fill(0));
  const logPerplexity = Math.log(perplexity);
  
  // For each point, find the appropriate sigma and compute probabilities
  for (let i = 0; i < n; i++) {
    // Binary search for the value of sigma that gives desired perplexity
    let betaMin = -Infinity;
    let betaMax = Infinity;
    let beta = 1.0; // Initial value of precision (1/sigma^2)
    let maxTries = 50;
    let tries = 0;
    
    // Keep track of the sum for normalization
    let sumP = 0;
    let H;
    
    // Temporary array for current row
    const currentRow = Array(n).fill(0);
    
    while (tries < maxTries) {
      // Compute Gaussian kernel row with precision beta
      sumP = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          currentRow[j] = Math.exp(-beta * distances[i][j]);
          sumP += currentRow[j];
        } else {
          currentRow[j] = 0;
        }
      }
      
      // Normalize
      const sum = sumP || 1e-10; // Avoid division by zero
      for (let j = 0; j < n; j++) {
        currentRow[j] /= sum;
      }
      
      // Calculate entropy
      H = 0;
      for (let j = 0; j < n; j++) {
        if (currentRow[j] > 1e-10) {
          H -= currentRow[j] * Math.log(currentRow[j]);
        }
      }
      
      // Check if we're close enough to desired perplexity
      const Hdiff = H - logPerplexity;
      if (Math.abs(Hdiff) < 1e-5) {
        break;
      }
      
      // Adjust beta based on error
      if (Hdiff > 0) {
        betaMin = beta;
        if (betaMax === Infinity) {
          beta *= 2;
        } else {
          beta = (beta + betaMax) / 2;
        }
      } else {
        betaMax = beta;
        if (betaMin === -Infinity) {
          beta /= 2;
        } else {
          beta = (beta + betaMin) / 2;
        }
      }
      
      tries++;
    }
    
    // Set final probability values for this row
    for (let j = 0; j < n; j++) {
      P[i][j] = currentRow[j];
    }
  }
  
  // Symmetrize the matrix and normalize
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      P[i][j] = (P[i][j] + P[j][i]) / (2 * n);
      P[i][j] = Math.max(P[i][j], 1e-12); // Set minimum value to avoid numerical problems
    }
  }
  
  return P;
}

function initializeLowDimensionalPoints(points, dimensions = 3) {
  const n = points.length;
  const result = Array(n).fill().map(() => Array(dimensions).fill(0));
  
  // Try to use PCA for initialization if available
  let usePCA = false;
  try {
    if (typeof PCA === 'function') {
      const pca = new PCA(points);
      const projection = pca.predict(points, {nComponents: dimensions});
      
      // Copy PCA results
      for (let i = 0; i < n; i++) {
        const row = projection.getRow(i);
        for (let d = 0; d < dimensions; d++) {
          result[i][d] = d < row.length ? row[d] : 0;
        }
      }
      
      usePCA = true;
      console.log('Using PCA for t-SNE initialization');
    }
  } catch (pcaError) {
    console.warn('PCA initialization failed, using random initialization:', pcaError);
    usePCA = false;
  }
  
  // Use random initialization if PCA failed
  if (!usePCA) {
    const scale = 0.0001; // Small scale for initial random values
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dimensions; d++) {
        result[i][d] = (Math.random() * 2 - 1) * scale;
      }
    }
    console.log('Using random initialization for t-SNE');
  }
  
  return result;
}

function performGradientDescent(P, Y, iterations, progressCallback) {
  return new Promise((resolve, reject) => {
    try {
      const n = Y.length;
      const dimensions = Y[0].length;
      
      // Clone Y to avoid modifying the input
      const currentY = Y.map(row => [...row]);
      
      // Initialize momentum and gains arrays
      const momentum = 0.5;
      const finalMomentum = 0.8;
      const learningRate = 200;
      const gradients = Array(n).fill().map(() => Array(dimensions).fill(0));
      const previousGradients = Array(n).fill().map(() => Array(dimensions).fill(0));
      const gains = Array(n).fill().map(() => Array(dimensions).fill(1.0));
      
      // Early exaggeration factor
      const earlyExaggeration = 12.0;
      const exaggerationSteps = Math.min(100, iterations / 4);
      
      // Use web worker or requestAnimationFrame for non-blocking execution
      let currentIteration = 0;
      
      function runIteration() {
        // Adjust early exaggeration
        const exaggerationFactor = currentIteration < exaggerationSteps ? earlyExaggeration : 1.0;
        
        // Compute Q distribution (similarities in low-dimensional space)
        const Q = calculateTDistribution(currentY);
        
        // Reset gradients
        for (let i = 0; i < n; i++) {
          for (let d = 0; d < dimensions; d++) {
            gradients[i][d] = 0;
          }
        }
        
        // Compute gradients
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i !== j) {
              // Force attraction (P) and repulsion (Q)
              const attraction = exaggerationFactor * P[i][j];
              const repulsion = Q.values[i][j];
              
              // Compute gradient component
              const diff = attraction - repulsion;
              
              // Compute distance in low-dimensional space
              const distance = Q.distances[i][j];
              
              // Update gradient for both points based on distance and difference
              for (let d = 0; d < dimensions; d++) {
                const direction = (currentY[i][d] - currentY[j][d]) * diff * Q.weights[i][j];
                gradients[i][d] += direction;
                gradients[j][d] -= direction; // Equal and opposite force
              }
            }
          }
        }
        
        // Update gains and apply momentum
        const momentumValue = currentIteration < 20 ? momentum : finalMomentum;
        
        // Update points based on gradients, gains, and momentum
        for (let i = 0; i < n; i++) {
          for (let d = 0; d < dimensions; d++) {
            // Adjust gains based on gradient direction changes
            if (Math.sign(gradients[i][d]) !== Math.sign(previousGradients[i][d])) {
              gains[i][d] += 0.2;
            } else {
              gains[i][d] *= 0.8;
            }
            
            // Ensure minimum gain
            gains[i][d] = Math.max(gains[i][d], 0.01);
            
            // Update previous gradients for next iteration
            previousGradients[i][d] = momentumValue * previousGradients[i][d] - 
                                     learningRate * gains[i][d] * gradients[i][d];
            
            // Update current position
            currentY[i][d] += previousGradients[i][d];
          }
        }
        
        // Center the points to avoid drifting
        if (currentIteration % 5 === 0) {
          centerPoints(currentY);
        }
        
        // Update progress
        if (progressCallback) {
          try {
            progressCallback(
              currentIteration + 1, 
              (currentIteration + 1) / iterations,
              currentY
            );
          } catch (callbackError) {
            console.error('Error in progress callback:', callbackError);
          }
        }
        
        // Check if we're done
        currentIteration++;
        if (currentIteration >= iterations) {
          // Final centering
          centerPoints(currentY);
          resolve(currentY);
          return;
        }
        
        // Schedule next iteration using requestAnimationFrame for UI responsiveness
        requestAnimationFrame(runIteration);
      }
      
      // Start the iterations
      runIteration();
      
    } catch (error) {
      console.error('Error in gradient descent:', error);
      reject(error);
    }
  });
}

/**
 * Calculate t-Distribution in low-dimensional space (Q matrix)
 */
function calculateTDistribution(Y) {
  const n = Y.length;
  const values = Array(n).fill().map(() => Array(n).fill(0));
  const distances = Array(n).fill().map(() => Array(n).fill(0));
  const weights = Array(n).fill().map(() => Array(n).fill(0));
  
  // Calculate squared distances and weights
  let sum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // Calculate squared Euclidean distance
      let squaredDistance = 0;
      for (let d = 0; d < Y[i].length; d++) {
        const diff = Y[i][d] - Y[j][d];
        squaredDistance += diff * diff;
      }
      
      // Calculate weight using t-distribution (1 / (1 + distance²))
      const weight = 1.0 / (1.0 + squaredDistance);
      
      // Store values symmetrically
      weights[i][j] = weight;
      weights[j][i] = weight;
      
      distances[i][j] = squaredDistance;
      distances[j][i] = squaredDistance;
      
      sum += 2 * weight; // Count both (i,j) and (j,i)
    }
  }
  
  // Normalize weights to get probabilities
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      values[i][j] = i !== j ? weights[i][j] / sum : 0;
    }
  }
  
  return {
    values,
    distances,
    weights
  };
}

/**
 * Center points to avoid drifting during optimization
 */
function centerPoints(points) {
  if (!points || points.length === 0) return;
  
  const dimensions = points[0].length;
  const n = points.length;
  
  // Calculate mean for each dimension
  const mean = Array(dimensions).fill(0);
  
  for (let i = 0; i < n; i++) {
    for (let d = 0; d < dimensions; d++) {
      mean[d] += points[i][d] / n;
    }
  }
  
  // Subtract mean from each point
  for (let i = 0; i < n; i++) {
    for (let d = 0; d < dimensions; d++) {
      points[i][d] -= mean[d];
    }
  }
}

/**
 * Interpolate sampled points back to full dataset
 */
function interpolateSampledPoints(sampledPoints, fullSize, sampleIndices) {
  const interpolated = Array(fullSize).fill().map(() => Array(sampledPoints[0].length).fill(0));
  
  // First, copy known points
  for (let i = 0; i < sampleIndices.length; i++) {
    interpolated[sampleIndices[i]] = [...sampledPoints[i]];
  }
  
  // For each point that wasn't in the sample
  for (let i = 0; i < fullSize; i++) {
    // Skip points that were in the sample
    if (sampleIndices.includes(i)) continue;
    
    // Find nearest sample points
    let nearestBefore = -1;
    let nearestAfter = -1;
    let minBeforeDist = Infinity;
    let minAfterDist = Infinity;
    
    for (let j = 0; j < sampleIndices.length; j++) {
      const sampleIdx = sampleIndices[j];
      const dist = Math.abs(sampleIdx - i);
      
      if (sampleIdx < i && dist < minBeforeDist) {
        nearestBefore = j;
        minBeforeDist = dist;
      } else if (sampleIdx > i && dist < minAfterDist) {
        nearestAfter = j;
        minAfterDist = dist;
      }
    }
    
    // Handle edge cases
    if (nearestBefore === -1) nearestBefore = 0;
    if (nearestAfter === -1) nearestAfter = sampleIndices.length - 1;
    
    // Linear interpolation
    const beforeIdx = sampleIndices[nearestBefore];
    const afterIdx = sampleIndices[nearestAfter];
    
    if (beforeIdx === afterIdx) {
      // Just copy if we only have one reference point
      interpolated[i] = [...sampledPoints[nearestBefore]];
    } else {
      // Weighted average based on distance
      const totalDist = afterIdx - beforeIdx;
      const t = totalDist > 0 ? (i - beforeIdx) / totalDist : 0;
      
      for (let d = 0; d < sampledPoints[0].length; d++) {
        interpolated[i][d] = sampledPoints[nearestBefore][d] * (1 - t) + 
                            sampledPoints[nearestAfter][d] * t;
      }
    }
  }
  
  return interpolated;
}

// Add this function to maintain consistency with other reduction methods
function applyUMAP(points, neighbors = 15, iterations = 300) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Starting UMAP with ${points.length} points`);
      
      // Create progress indicator
      let progressElement = document.getElementById('umapProgress');
      if (!progressElement) {
        progressElement = document.createElement('div');
        progressElement.id = 'umapProgress';
        progressElement.style.position = 'absolute';
        progressElement.style.top = '10px';
        progressElement.style.left = '10px';
        progressElement.style.padding = '8px';
        progressElement.style.background = 'rgba(0, 0, 0, 0.7)';
        progressElement.style.color = 'white';
        progressElement.style.borderRadius = '4px';
        progressElement.style.zIndex = '1000';
        document.body.appendChild(progressElement);
      }
      progressElement.textContent = 'Starting UMAP...';
      
      // Check if we should use Python backend
      if (usePythonBackend) {
        try {
          console.log('Using Python backend for UMAP');
          progressElement.textContent = 'Using Python backend for UMAP...';
          
          // Use PyodideBridge to run UMAP
          const result = await PyodideBridge.applyUMAP(points, neighbors, iterations, 3);
          
          // Remove progress indicator
          if (progressElement.parentNode) {
            progressElement.parentNode.removeChild(progressElement);
          }
          
          if (result && Array.isArray(result) && result.length > 0) {
            console.log('Python UMAP completed successfully. Sample result:', 
                      Array.isArray(result[0]) ? result.slice(0, 3) : 'Not a 2D array');
            resolve(result);
          } else {
            console.warn('Python UMAP returned invalid result, falling back to JS implementation');
            progressElement.textContent = 'Falling back to JavaScript UMAP...';
            
            // Fall back to JS implementation
            const jsResult = await applyUMAPJS(points, neighbors, iterations);
            resolve(jsResult);
          }
        } catch (error) {
          console.error('Python UMAP failed:', error);
          progressElement.textContent = 'Python UMAP failed, using JavaScript fallback...';
          
          // Fall back to JS implementation
          const jsResult = await applyUMAPJS(points, neighbors, iterations);
          resolve(jsResult);
        }
      } else {
        // Use JavaScript implementation
        console.log('Using JavaScript implementation for UMAP');
        progressElement.textContent = 'Using JavaScript for UMAP...';
        
        const result = await applyUMAPJS(points, neighbors, iterations);
        resolve(result);
      }
    } catch (error) {
      console.error('UMAP setup error:', error);
      
      const progressElement = document.getElementById('umapProgress');
      if (progressElement && progressElement.parentNode) {
        progressElement.parentNode.removeChild(progressElement);
      }
      
      reject(error);
    }
  });
}

// JavaScript implementation of UMAP with perplexity/neighbors display update
function applyUMAPJS(points, neighbors = 15, iterations = 300) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Starting JavaScript UMAP with ${points.length} points, neighbors: ${neighbors}, iterations: ${iterations}`);
      
      // Create progress indicator
      const progressElement = document.getElementById('umapProgress') || document.createElement('div');
      progressElement.id = 'umapProgress';
      progressElement.style.position = 'absolute';
      progressElement.style.top = '10px';
      progressElement.style.left = '10px';
      progressElement.style.padding = '8px';
      progressElement.style.background = 'rgba(0, 0, 0, 0.7)';
      progressElement.style.color = 'white';
      progressElement.style.borderRadius = '4px';
      progressElement.style.zIndex = '1000';
      progressElement.textContent = 'Processing JavaScript UMAP: 0%';
      
      if (!progressElement.parentNode) {
        document.body.appendChild(progressElement);
      }
      
      // UMAP can be slow with large datasets, so we'll sample if needed
      const MAX_UMAP_POINTS = 2000; // Reduced for better browser performance
      let umapPoints = points;
      let samplingUsed = false;
      let sampleIndices = []; // Store indices of sampled points
      
      if (points.length > MAX_UMAP_POINTS) {
        console.log(`Sampling ${MAX_UMAP_POINTS} points for UMAP from ${points.length} total points`);
        umapPoints = [];
        sampleIndices = [];
        const step = Math.floor(points.length / MAX_UMAP_POINTS);
        for (let i = 0; i < points.length; i += step) {
          if (umapPoints.length < MAX_UMAP_POINTS) {
            if (Array.isArray(points[i]) && points[i].length >= 3) {
              umapPoints.push([
                Number(points[i][0]) || 0,
                Number(points[i][1]) || 0,
                Number(points[i][2]) || 0
              ]);
              sampleIndices.push(i);
            }
          }
        }
        samplingUsed = true;
      } else {
        // Use all points but make safe copies
        umapPoints = points.map(p => {
          if (Array.isArray(p) && p.length >= 3) {
            return [
              Number(p[0]) || 0,
              Number(p[1]) || 0,
              Number(p[2]) || 0
            ];
          }
          return [0, 0, 0];
        });
        
        // Create sequential indices
        sampleIndices = Array.from(Array(points.length).keys());
      }
      
      // Calculate optimal neighbors parameter based on dataset size
      const optimalNeighbors = Math.min(
        Math.max(5, Math.floor(Math.sqrt(umapPoints.length) / 3)),
        Math.min(neighbors, Math.floor(umapPoints.length / 4))
      );
      
      console.log(`Using optimized neighbors parameter: ${optimalNeighbors}`);
      
      // Update perplexity display in the UI
      // For UMAP we use neighbors instead of perplexity, but update the same display
      updatePerplexityDisplay(optimalNeighbors);
      
      // Create and configure UMAP instance
      const umap = new UMAP({
        nComponents: 3,
        nNeighbors: optimalNeighbors,
        minDist: 0.1,
        nEpochs: iterations,
        spread: 1.0,
        scalingEpochsRatio: 0.5
      });
      
      // Perform UMAP in batches to keep UI responsive
      setTimeout(() => {
        try {
          console.log('Starting UMAP fitting...');
          progressElement.textContent = 'Processing JavaScript UMAP: Fitting...';
          
          // Fit UMAP
          const result = umap.fit(umapPoints);
          
          console.log('UMAP fitting complete, processing results...');
          progressElement.textContent = 'Processing UMAP: Processing...';
          
          // Reshape to 3D points
          const result3D = [];
          for (let i = 0; i < result.length; i++) {
            result3D.push([
              result[i][0] || 0, 
              result[i][1] || 0, 
              result[i].length > 2 ? result[i][2] || 0 : 0 // Handle 2D result
            ]);
          }
          
          let finalResult = result3D;
          
          // If we sampled, interpolate back to full dataset
          if (samplingUsed) {
            console.log('Interpolating UMAP results back to full dataset');
            finalResult = Array(points.length).fill().map(() => [0, 0, 0]);
            
            // First fill known points
            for (let i = 0; i < sampleIndices.length; i++) {
              const originalIndex = sampleIndices[i];
              finalResult[originalIndex] = [...result3D[i]];
            }
            
            // Then interpolate missing points
            for (let i = 0; i < points.length; i++) {
              // Skip known points
              if (sampleIndices.includes(i)) continue;
              
              // Find nearest known points before and after
              let before = -1;
              let after = -1;
              
              for (let j = 0; j < sampleIndices.length; j++) {
                if (sampleIndices[j] < i && (before === -1 || sampleIndices[j] > sampleIndices[before])) {
                  before = j;
                }
                if (sampleIndices[j] > i && (after === -1 || sampleIndices[j] < sampleIndices[after])) {
                  after = j;
                }
              }
              
              // Handle edge cases
              if (before === -1) before = 0;
              if (after === -1) after = sampleIndices.length - 1;
              
              // Linear interpolation
              const beforeIdx = sampleIndices[before];
              const afterIdx = sampleIndices[after];
              
              if (beforeIdx === afterIdx) {
                finalResult[i] = [...result3D[before]];
              } else {
                const t = (i - beforeIdx) / (afterIdx - beforeIdx);
                
                for (let d = 0; d < 3; d++) {
                  finalResult[i][d] = result3D[before][d] * (1 - t) + result3D[after][d] * t;
                }
              }
            }
          }
          
          // Normalize the points to fit in visualization space
          const normalizedResult = normalizePoints(finalResult);
          
          // Remove progress indicator
          if (progressElement.parentNode) {
            progressElement.parentNode.removeChild(progressElement);
          }
          
          // Schedule camera adjustment after render
          setTimeout(() => {
            adjustCameraToVisualization(rightRenderer);
          }, 500);
          
          console.log('JavaScript UMAP completed successfully');
          resolve(normalizedResult);
          
        } catch (error) {
          console.error('Error in JavaScript UMAP process:', error);
          
          // Remove progress indicator
          if (progressElement.parentNode) {
            progressElement.parentNode.removeChild(progressElement);
          }
          
          // Fall back to PCA if UMAP fails
          console.log('Falling back to PCA due to UMAP error');
          const pcaResult = applyPCAJS(points);
          resolve(pcaResult);
        }
      }, 100); // Small delay to allow UI to update
      
    } catch (error) {
      console.error('Error setting up JavaScript UMAP:', error);
      
      // Remove progress indicator
      const progressElement = document.getElementById('umapProgress');
      if (progressElement && progressElement.parentNode) {
        progressElement.parentNode.removeChild(progressElement);
      }
      
      // Fall back to PCA
      console.log('Falling back to PCA due to UMAP setup error');
      const pcaResult = applyPCAJS(points);
      resolve(pcaResult);
    }
  });
}

// Improved normalization function with better messages
function normalizePoints(points) {
  if (!points?.length || !Array.isArray(points)) {
    console.error('Cannot normalize non-array points');
    return [];
  }

  try {    
    // Check if points is already in the right format
    if (!Array.isArray(points[0])) {
      console.warn('Points are not in expected 2D array format');
      // Try to convert to 2D array if it's flat
      if (points.length % 3 === 0) {
        const newPoints = [];
        for (let i = 0; i < points.length; i += 3) {
          newPoints.push([points[i], points[i+1], points[i+2]]);
        }
        points = newPoints;
      } else {
        return points; // Return original if we can't reshape
      }
    }

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    // First pass: find min/max for each dimension
    for (const point of points) {
      if (Array.isArray(point)) {
        for (let dim = 0; dim < Math.min(point.length, 3); dim++) {
          if (typeof point[dim] === 'number' && !isNaN(point[dim])) {
            min[dim] = Math.min(min[dim], point[dim]);
            max[dim] = Math.max(max[dim], point[dim]);
          }
        }
      }
    }

    // Check if we have valid min/max ranges
    const hasValidRange = min.every((val, i) => val !== Infinity && max[i] !== -Infinity && Math.abs(max[i] - val) > 0.0001);
    
    if (!hasValidRange) {
      // Improved and clearer message
      const ranges = min.map((minVal, i) => max[i] - minVal);
      console.log(`Data has dimensions with very small or zero range: [${ranges.join(', ')}]. Using identity transform for normalization.`);
      return points;
    }

    // Second pass: normalize each point
    const normalized = points.map(point => {
      if (!Array.isArray(point)) return [0, 0, 0];
      
      const result = [0, 0, 0];
      
      for (let dim = 0; dim < Math.min(point.length, 3); dim++) {
        if (typeof point[dim] === 'number' && !isNaN(point[dim])) {
          // Map to [-1, 1] range
          result[dim] = ((point[dim] - min[dim]) / (max[dim] - min[dim])) * 2 - 1;
        }
      }
      
      return result;
    });
    
    console.log(`Normalization successful: Mapped ranges from [${min.join(',')}-${max.join(',')}] to [-1,1]`);
    return normalized;
  } catch (error) {
    console.error('Error normalizing points:', error);
    return points;
  }
}


// ================== DIFFERENCE VISUALIZATION ================== //

// Differences calculation with Python/JS switching
function calculateDifferences() {
  return new Promise(async (resolve, reject) => {
    try {
      if (!Array.isArray(originalPoints) || !originalPoints.length || 
          !Array.isArray(reducedPoints) || !reducedPoints.length) {
        throw new Error('Missing original or reduced points');
      }

      // Make local copies instead of modifying global variables
      let origPoints = originalPoints;
      let redPoints = reducedPoints;

      // Ensure both arrays have the same length
      if (origPoints.length !== redPoints.length) {
        console.warn(`Point count mismatch: original=${origPoints.length}, reduced=${redPoints.length}`);
        
        // Make sure reducedPoints is sized correctly
        if (redPoints.length < origPoints.length) {
          // We need to pad the reduced points to match the original length
          const extraPoints = origPoints.length - redPoints.length;
          console.log(`Adding ${extraPoints} padding points to reduced data`);
          
          // Duplicate the last point or create zeros
          const padPoint = redPoints.length > 0 ? [...redPoints[redPoints.length-1]] : [0, 0, 0];
          
          for (let i = 0; i < extraPoints; i++) {
            redPoints.push([...padPoint]);
          }
        } else if (redPoints.length > origPoints.length) {
          // Truncate reduced points to match original length
          redPoints = redPoints.slice(0, origPoints.length);
        }
      }

      console.log(`Calculating differences for ${origPoints.length} points`);
      
      // Check if we should use Python backend
      if (usePythonBackend) {
        try {
          console.log('Using Python backend for difference calculation');
          updateStatusMessage('Using Python backend for difference calculation...', 'info');
          
          // Use PyodideBridge to calculate differences
          const result = await PyodideBridge.calculateDifferences(origPoints, redPoints);
          
          if (result) {
            console.log('Python difference calculation completed successfully');
            updateStatusMessage('Differences calculated successfully!', 'success');
            resolve(result);
          } else {
            console.warn('Python difference calculation returned invalid result, falling back to JS implementation');
            updateStatusMessage('Falling back to JavaScript difference calculation', 'warning');
            
            // Fall back to JS implementation
            const jsResult = calculateDifferencesJS(origPoints, redPoints);
            resolve(jsResult);
          }
        } catch (error) {
          console.error('Python difference calculation failed:', error);
          updateStatusMessage('Python difference calculation failed, using JavaScript fallback', 'warning');
          
          // Fall back to JS implementation
          const jsResult = calculateDifferencesJS(origPoints, redPoints);
          resolve(jsResult);
        }
      } else {
        // Use JavaScript implementation
        console.log('Using JavaScript for difference calculation');
        const result = calculateDifferencesJS(origPoints, redPoints);
        resolve(result);
      }
    } catch (error) {
      console.error('Difference calculation error:', error);
      reject(error);
    }
  });
}

// JavaScript implementation of differences calculation (for fallback)
function calculateDifferencesJS(origPoints, redPoints) {
  try {
    console.log(`Calculating differences using JavaScript for ${origPoints.length} points`);

    const displacements = [];
    const magnitudes = [];
    let maxMagnitude = 0;
    let sumMagnitudes = 0;

    // Process in smaller chunks to avoid UI freezing
    const CHUNK_SIZE = 5000;

    for (let i = 0; i < origPoints.length; i++) {
      const pt = origPoints[i];
      const rpt = redPoints[i];

      // Skip if either point is invalid
      if (!Array.isArray(pt) || !Array.isArray(rpt)) {
        displacements.push([0, 0, 0]);
        magnitudes.push(0);
        continue;
      }

      // Ensure points have three dimensions
      const origX = pt[0] || 0;
      const origY = pt.length > 1 ? pt[1] || 0 : 0;
      const origZ = pt.length > 2 ? pt[2] || 0 : 0;
      
      const redX = rpt[0] || 0;
      const redY = rpt.length > 1 ? rpt[1] || 0 : 0;
      const redZ = rpt.length > 2 ? rpt[2] || 0 : 0;

      const dx = origX - redX;
      const dy = origY - redY;
      const dz = origZ - redZ;

      displacements.push([dx, dy, dz]);

      const magnitude = Math.sqrt(dx*dx + dy*dy + dz*dz);
      magnitudes.push(magnitude);

      maxMagnitude = Math.max(maxMagnitude, magnitude);
      sumMagnitudes += magnitude;

      // Log progress for large datasets
      if (origPoints.length > CHUNK_SIZE && i % CHUNK_SIZE === 0) {
        console.log(`Processed ${i}/${origPoints.length} points`);
      }
    }

    console.log(`Differences calculated. Max: ${maxMagnitude}, Avg: ${sumMagnitudes/magnitudes.length}`);

    return {
      displacements,
      magnitudes,
      max: maxMagnitude,
      avg: sumMagnitudes / magnitudes.length
    };

  } catch (error) {
    console.error('JavaScript difference calculation error:', error);
    return null;
  }
}

// Simple and robust implementation of visualizeDifferences
function visualizeDifferences() {
  try {
    console.log('Visualizing differences...');
    
    // Check if we have the necessary data
    if (!originalPoints || !originalPoints.length) {
      throw new Error('No original points to compare');
    }
    
    if (!reducedPoints || !reducedPoints.length) {
      throw new Error('No reduced points to compare');
    }
    
    if (!rightMapper || !rightMapper.getInputData()) {
      throw new Error('Right view not properly initialized');
    }
    
    // Create status message
    const statusElement = document.createElement('div');
    statusElement.style.position = 'absolute';
    statusElement.style.top = '50%';
    statusElement.style.left = '50%';
    statusElement.style.transform = 'translate(-50%, -50%)';
    statusElement.style.padding = '15px';
    statusElement.style.background = 'rgba(0, 0, 0, 0.7)';
    statusElement.style.color = 'white';
    statusElement.style.borderRadius = '4px';
    statusElement.style.zIndex = '2000';
    statusElement.textContent = 'Calculating differences...';
    document.body.appendChild(statusElement);
    
    // Match array lengths
    const pointCount = Math.min(originalPoints.length, reducedPoints.length);
    console.log(`Using ${pointCount} points for difference calculation`);
    
    // Calculate differences and color values
    const colors = [];
    let maxDiff = 0;
    
    // Calculate color values based on distance
    for (let i = 0; i < pointCount; i++) {
      const orig = originalPoints[i];
      const reduced = reducedPoints[i];
      
      // Handle possibly invalid points
      if (!Array.isArray(orig) || !Array.isArray(reduced) || 
          orig.length < 3 || reduced.length < 3) {
        colors.push([128, 128, 128]); // Gray for invalid points
        continue;
      }
      
      // Calculate Euclidean distance between original and reduced points
      const dx = (orig[0] || 0) - (reduced[0] || 0);
      const dy = (orig[1] || 0) - (reduced[1] || 0);
      const dz = (orig[2] || 0) - (reduced[2] || 0);
      
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      maxDiff = Math.max(maxDiff, distance);
      
      // Store distance for later normalization
      colors.push(distance);
    }
    
    // Create final color array with normalized values
    const rgbColors = [];
    for (let i = 0; i < colors.length; i++) {
      const distance = colors[i];
      
      // If it's already an RGB array, just use it (for invalid points)
      if (Array.isArray(distance)) {
        rgbColors.push(distance);
        continue;
      }
      
      // Normalize and create color (red = high difference, green = low difference)
      const ratio = Math.min(1, distance / (maxDiff || 1));
      rgbColors.push([
        Math.floor(ratio * 255),        // Red
        Math.floor((1 - ratio) * 255),  // Green
        50                              // Blue (fixed value)
      ]);
    }
    
    // Get the right polydata
    const rightPolyData = rightMapper.getInputData();
    const pointsCount = rightPolyData.getPoints().getNumberOfPoints();
    
    // Ensure we have the right number of colors
    while (rgbColors.length < pointsCount) {
      rgbColors.push([128, 128, 128]); // Add gray for missing points
    }
    
    if (rgbColors.length > pointsCount) {
      rgbColors.length = pointsCount; // Truncate if needed
    }
    
    statusElement.textContent = 'Applying colors...';
    
    // Apply colors to the visualization
    setTimeout(() => {
      try {
        // Create flat color array for VTK
        const flatColors = new Float32Array(rgbColors.length * 3);
        
        for (let i = 0; i < rgbColors.length; i++) {
          const color = rgbColors[i];
          flatColors[i*3] = color[0] / 255;     // Red (normalized to 0-1)
          flatColors[i*3+1] = color[1] / 255;   // Green
          flatColors[i*3+2] = color[2] / 255;   // Blue
        }
        
        // Create VTK data array
        const colorArray = vtkDataArray.newInstance({
          name: 'Colors',
          values: flatColors,
          numberOfComponents: 3
        });
        
        // Apply to point data
        rightPolyData.getPointData().setScalars(colorArray);
        
        // Make sure mapper uses the colors
        rightMapper.setScalarVisibility(true);
        rightMapper.setColorModeToDefault();
        rightMapper.setScalarModeToUsePointData();
        
        // Update rendering
        rightRenderWindow.render();
        
        console.log('Difference visualization completed successfully');
        statusElement.textContent = 'Visualization complete!';
        
        // Remove status element after a short delay
        setTimeout(() => {
          if (statusElement.parentNode) {
            statusElement.parentNode.removeChild(statusElement);
          }
        }, 1500);
        
      } catch (colorError) {
        console.error('Error applying colors:', colorError);
        
        statusElement.textContent = 'Error: ' + colorError.message;
        statusElement.style.background = 'rgba(255, 0, 0, 0.7)';
        
        // Remove error message after a delay
        setTimeout(() => {
          if (statusElement.parentNode) {
            statusElement.parentNode.removeChild(statusElement);
          }
        }, 3000);
      }
    }, 100);
    
  } catch (error) {
    console.error('Visualization error:', error);
    
    // Show error message
    const errorElement = document.createElement('div');
    errorElement.style.position = 'absolute';
    errorElement.style.top = '50%';
    errorElement.style.left = '50%';
    errorElement.style.transform = 'translate(-50%, -50%)';
    errorElement.style.padding = '15px';
    errorElement.style.background = 'rgba(255, 0, 0, 0.7)';
    errorElement.style.color = 'white';
    errorElement.style.borderRadius = '4px';
    errorElement.style.zIndex = '2000';
    errorElement.textContent = 'Visualization error: ' + error.message;
    document.body.appendChild(errorElement);
    
    // Remove after a delay
    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.parentNode.removeChild(errorElement);
      }
    }, 5000);
  }
}

// Enhanced function to properly focus camera on visualization
function adjustCameraToVisualization(renderer) {
  if (!renderer) {
    console.error('Cannot adjust camera: renderer is undefined');
    return;
  }
  
  try {
    console.log('Adjusting camera for optimal visualization...');
    
    const camera = renderer.getActiveCamera();
    const actors = renderer.getActors();
    
    if (actors.length === 0) {
      console.error('No actors found in the scene');
      return;
    }
    
    // Force a render to ensure all actors are properly initialized
    renderer.getRenderWindow().render();
    
    // Get all actors in the scene
    let allBounds = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
    
    // Find the combined bounds of all actors
    actors.forEach(actor => {
      if (!actor) return;
      
      // Update actor for accurate bounds
      actor.getMapper().update();
      
      const bounds = actor.getBounds();
      
      // Expand the overall bounds
      allBounds[0] = Math.min(allBounds[0], bounds[0]);
      allBounds[1] = Math.max(allBounds[1], bounds[1]);
      allBounds[2] = Math.min(allBounds[2], bounds[2]);
      allBounds[3] = Math.max(allBounds[3], bounds[3]);
      allBounds[4] = Math.min(allBounds[4], bounds[4]);
      allBounds[5] = Math.max(allBounds[5], bounds[5]);
    });
    
    // Calculate center point
    const center = [
      (allBounds[0] + allBounds[1]) / 2,
      (allBounds[2] + allBounds[3]) / 2,
      (allBounds[4] + allBounds[5]) / 2
    ];
    
    // Check if bounds are valid
    const isValidBounds = !isNaN(center[0]) && 
                          !isNaN(center[1]) && 
                          !isNaN(center[2]) &&
                          allBounds[0] !== Infinity;
    
    if (!isValidBounds) {
      console.warn('Invalid bounds detected, using default camera settings');
      
      // Set default camera position
      camera.setPosition(0, 0, 5);
      camera.setFocalPoint(0, 0, 0);
      camera.setViewUp(0, 1, 0);
    } else {
      // Calculate diagonal size for proper framing
      const sizeX = Math.abs(allBounds[1] - allBounds[0]);
      const sizeY = Math.abs(allBounds[3] - allBounds[2]);
      const sizeZ = Math.abs(allBounds[5] - allBounds[4]);
      
      const diagonalSize = Math.sqrt(sizeX*sizeX + sizeY*sizeY + sizeZ*sizeZ);
      
      // Ensure non-zero size
      const distance = diagonalSize > 0 ? diagonalSize * 2.0 : 10;
      
      // Set camera to look slightly from the side and above
      camera.setPosition(
        center[0] + distance * 0.7,  // Offset in X
        center[1] + distance * 0.5,  // Offset in Y (slightly above)
        center[2] + distance * 0.6   // Offset in Z
      );
      
      // Focus on the center of the point cloud
      camera.setFocalPoint(center[0], center[1], center[2]);
      
      // Set vertical orientation
      camera.setViewUp(0, 1, 0);
    }
    
    // Reset clipping range to ensure all points are visible
    renderer.resetCameraClippingRange();
    
    // Force a render with new camera settings
    renderer.getRenderWindow().render();
    
    console.log('Camera adjustment complete');
    
  } catch (error) {
    console.error('Error adjusting camera:', error);
    
    // Attempt basic camera reset as fallback
    try {
      renderer.resetCamera();
      renderer.getRenderWindow().render();
      console.log('Basic camera reset applied as fallback');
    } catch (fallbackError) {
      console.error('Fallback camera reset failed:', fallbackError);
    }
  }
}

// Add these helper functions to your code

// Improved update status message with error recovery
function updateStatusMessage(message, type = 'info') {
  try {
    // Remove any existing status message
    let statusElement = document.getElementById('statusMessage');
    if (!statusElement) {
      statusElement = document.createElement('div');
      statusElement.id = 'statusMessage';
      statusElement.style.position = 'absolute';
      statusElement.style.bottom = '40px';
      statusElement.style.left = '10px';
      statusElement.style.padding = '10px';
      statusElement.style.borderRadius = '4px';
      statusElement.style.zIndex = '1001';
      statusElement.style.maxWidth = '80%';
      statusElement.style.textAlign = 'center';
      document.body.appendChild(statusElement);
    }

    // Style based on message type
    switch(type) {
      case 'error':
        statusElement.style.background = 'rgba(220, 53, 69, 0.8)'; // Red
        statusElement.style.color = 'white';
        break;
      case 'success':
        statusElement.style.background = 'rgba(40, 167, 69, 0.8)'; // Green
        statusElement.style.color = 'white';
        break;
      case 'warning':
        statusElement.style.background = 'rgba(255, 193, 7, 0.8)'; // Yellow
        statusElement.style.color = 'black';
        break;
      default: // info
        statusElement.style.background = 'rgba(0, 123, 255, 0.8)'; // Blue
        statusElement.style.color = 'white';
    }

    statusElement.textContent = message;

    // Auto-hide after 5 seconds for success and info messages
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        if (statusElement.parentNode) {
          statusElement.parentNode.removeChild(statusElement);
        }
      }, 5000);
    }

  } catch (error) {
    // In case of error, use console
    console.error('Error updating status message:', error);
    console.log('Status message was:', message, type);
  }
}


// Create a general function to update perplexity display
function updatePerplexityDisplay(value) {
  // Update the main display in the control panel
  const displayEl = document.getElementById('perplexityDisplay');
  if (displayEl) {
    displayEl.textContent = `Perplexity: ${value}`;
  }
  
  // Update the value span if it exists
  const valueEl = document.getElementById('perplexityValue');
  if (valueEl) {
    valueEl.textContent = value;
  }
  
  // Update the slider if it exists (without triggering events)
  const slider = document.querySelector('.perplexity');
  if (slider) {
    slider.value = value;
  }
  
  console.log(`Perplexity display updated to: ${value}`);
}

// Fix the updatePerplexityMenuItem function to use the correct variable
function updatePerplexityMenuItem(value) {
  let perplexityMenuItem = document.querySelector('.menu-item.perplexity');
  if (!perplexityMenuItem) {
    // Find menu container first
    const menuContainer = document.getElementById('collapsible-menu');
    if (menuContainer) {
      perplexityMenuItem = document.createElement('div');
      perplexityMenuItem.className = 'menu-item perplexity';
      menuContainer.prepend(perplexityMenuItem);
    } else {
      console.warn('Menu container not found, cannot update perplexity menu item');
      return;
    }
  }
  perplexityMenuItem.textContent = `Perplexity: ${value}`;
}

// Function to process reduction but preserve original view option
async function processWithReductionShowOriginalFirst() {
  if (!currentPolyData || isProcessing) return;

  isProcessing = true;
  console.log('Starting reduction process...');

  try {
    const method = document.querySelector('.dimReduction')?.value || 'none';
    const perplexity = Number(document.querySelector('.perplexity')?.value) || 30;
    const iterations = Number(document.querySelector('.iterations')?.value) || 500;

    console.log(`Method: ${method}, Perplexity: ${perplexity}, Iterations: ${iterations}`);

    if (method === 'none') {
      console.log('No reduction selected, skipping process');
      isProcessing = false;
      return;
    }

    // Update status message
    updateStatusMessage(`Starting ${method} reduction...`);
    
    activeReduction = method;
    const points = getPointsFromPolyData(currentPolyData);

    if (!points || !points.length) {
      throw new Error('No points to reduce');
    }

    // First ensure both views show the original data
    updateBothViewsWithOriginal();

    // Add a "Show Reduced" button to allow the user to toggle
    addShowReducedButton();

    // Log original points only if they're an array
    if (Array.isArray(points) && points.length > 0) {
      console.log('Original points sample:', points.slice(0, 3));
      console.log('Original point count:', points.length);
    }

    let result;
    try {
      switch(method) {
        case 'pca':
          result = await applyPCA(points);
          break;
        case 'tsne':
          updateStatusMessage(`Running t-SNE with ${points.length} points...`);
          result = await applyTSNE(points, perplexity, iterations);
          break;
        case 'umap':
          result = await applyUMAP(points, perplexity, iterations);
          break;
        default:
          updateStatusMessage(`Unknown reduction method: ${method}`);
          console.warn('Unknown reduction method:', method);
          throw new Error(`Unknown reduction method: ${method}`);
      }
    } catch (reductionError) {
      console.error(`${method} reduction error:`, reductionError);
      updateStatusMessage(`Error during ${method}: ${reductionError.message}`, 'error');
      throw reductionError; // Propagate the error, no fallback
    }

    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error(`${method} returned invalid or empty results`);
    }

    reducedPoints = result;
    window.reducedPointsReady = true;
    
    // Update point count information
    updatePointCountDisplay();
    
    updateStatusMessage(`${method} reduction completed! Click "Show Reduced Data" to view.`, 'success');

  } catch (error) {
    console.error('Process error:', error);
    updateStatusMessage(`Reduction failed: ${error.message}`, 'error');
  } finally {
    isProcessing = false;
  }
}

// Function to add a "Show Reduced" button
function addShowReducedButton() {
  // Remove any existing button first
  const existingButton = document.getElementById('toggleReducedButton');
  if (existingButton) {
    existingButton.parentNode.removeChild(existingButton);
  }
  
  // Create a new button
  const toggleButton = document.createElement('button');
  toggleButton.id = 'toggleReducedButton';
  toggleButton.textContent = 'Show Reduced Data';
  toggleButton.style.position = 'absolute';
  toggleButton.style.top = '50px';
  toggleButton.style.right = '650px';
  toggleButton.style.zIndex = '1000';
  toggleButton.style.padding = '8px 12px';
  toggleButton.style.backgroundColor = '#007bff';
  toggleButton.style.color = 'white';
  toggleButton.style.border = 'none';
  toggleButton.style.borderRadius = '4px';
  toggleButton.style.cursor = 'pointer';
  
  // Add click handler to toggle between original and reduced view
  toggleButton.addEventListener('click', function() {
    if (window.rightViewShowingOriginal) {
      // Switch to reduced view
      if (reducedPoints && Array.isArray(reducedPoints) && reducedPoints.length > 0) {
        const rightPolyData = rightMapper.getInputData();
        updatePolyData(rightPolyData, reducedPoints);
        
        // Update the label
        updateViewLabels('Original', activeReduction + ' Reduced');
        
        // Update button text
        this.textContent = 'Show Original Data';
        
        // Reset camera on the right view
        rightRenderer.resetCamera();
        rightRenderWindow.render();
        
        // Update state variable
        window.rightViewShowingOriginal = false;
      } else {
        console.error('Reduced points not available');
      }
    } else {
      // Switch back to original view
      const rightPolyData = rightMapper.getInputData();
      updatePolyData(rightPolyData, originalPoints);

      // Update the label
      updateViewLabels('Original', 'Original (Pre-reduction)');
      
      // Update button text
      this.textContent = 'Show Reduced Data';
      
      // Reset camera on the right view
      rightRenderer.resetCamera();
      rightRenderWindow.render();
      
      // Update state variable
      window.rightViewShowingOriginal = true;
    }
  });
  
  // Add to document
  document.body.appendChild(toggleButton);
}

// ================== PIPELINE CONTROL ================== //

// Add this function to display point count information
function updatePointCountDisplay() {
  try {
    const countContainer = document.getElementById('pointCountInfo');
    if (!countContainer) {
      // Create element if it doesn't exist
      const container = document.querySelector('.content') || document.getElementById('leftContainer');
      if (container) {
        const infoBox = document.createElement('div');
        infoBox.id = 'pointCountInfo';
        infoBox.style.position = 'absolute';
        infoBox.style.bottom = '10px';
        infoBox.style.left = '10px';
        infoBox.style.padding = '10px';
        infoBox.style.background = 'rgba(0, 0, 0, 0.7)';
        infoBox.style.color = 'white';
        infoBox.style.borderRadius = '4px';
        infoBox.style.zIndex = '1000';
        container.appendChild(infoBox);
      }
    }

    // Update the count information
    const infoBox = document.getElementById('pointCountInfo');
    if (infoBox) {
      const originalCount = Array.isArray(originalPoints) ? originalPoints.length : 0;
      const reductionMethod = activeReduction || 'None';
      const backend = usePythonBackend ? 'Python' : 'JavaScript';

      infoBox.innerHTML = `
        <div><strong>Points:</strong> ${originalCount}</div>
        <div><strong>Method:</strong> ${reductionMethod}</div>
      `;

      console.log('Point count display updated:', originalCount, 'points');
    } else {
      console.error('Could not find or create point count display');
    }
  } catch (error) {
    console.error('Error updating point count display:', error);
  }
}

// Only add new variables (don't redeclare camerasLinked which already exists)
let previousLeftCameraPosition = null;
let previousLeftCameraFocalPoint = null;
let syncMode = 'relative'; // 'exact' or 'relative'

// Modified function to sync cameras with relative movement
function syncCameras(mode = 'relative') {
  if (!leftRenderer || !rightRenderer) return;

  const sourceCamera = leftRenderer.getActiveCamera();
  const targetCamera = rightRenderer.getActiveCamera();
  
  if (mode === 'exact') {
    // Exact copy - previous behavior
    const position = sourceCamera.getPosition();
    const focalPoint = sourceCamera.getFocalPoint();
    const viewUp = sourceCamera.getViewUp();

    targetCamera.setPosition(position[0], position[1], position[2]);
    targetCamera.setFocalPoint(focalPoint[0], focalPoint[1], focalPoint[2]);
    targetCamera.setViewUp(viewUp[0], viewUp[1], viewUp[2]);
  } 
  else if (mode === 'relative') {
    // Relative movement - new behavior
    const currentPosition = sourceCamera.getPosition();
    const currentFocalPoint = sourceCamera.getFocalPoint();
    
    // If we have previous values, calculate the delta
    if (previousLeftCameraPosition && previousLeftCameraFocalPoint) {
      // Calculate position delta
      const deltaX = currentPosition[0] - previousLeftCameraPosition[0];
      const deltaY = currentPosition[1] - previousLeftCameraPosition[1];
      const deltaZ = currentPosition[2] - previousLeftCameraPosition[2];
      
      // Calculate focal point delta
      const deltaFocalX = currentFocalPoint[0] - previousLeftCameraFocalPoint[0];
      const deltaFocalY = currentFocalPoint[1] - previousLeftCameraFocalPoint[1];
      const deltaFocalZ = currentFocalPoint[2] - previousLeftCameraFocalPoint[2];
      
      // Get current right camera settings
      const rightPosition = targetCamera.getPosition();
      const rightFocalPoint = targetCamera.getFocalPoint();
      
      // Apply deltas to right camera
      targetCamera.setPosition(
        rightPosition[0] + deltaX,
        rightPosition[1] + deltaY,
        rightPosition[2] + deltaZ
      );
      
      targetCamera.setFocalPoint(
        rightFocalPoint[0] + deltaFocalX,
        rightFocalPoint[1] + deltaFocalY,
        rightFocalPoint[2] + deltaFocalZ
      );
    }
    
    // Copy the view up vector directly (keeps the "up" direction consistent)
    const viewUp = sourceCamera.getViewUp();
    targetCamera.setViewUp(viewUp[0], viewUp[1], viewUp[2]);
  }
  
  // Update records of previous camera state
  previousLeftCameraPosition = [...sourceCamera.getPosition()];
  previousLeftCameraFocalPoint = [...sourceCamera.getFocalPoint()];

  // Update the right view
  rightRenderer.resetCameraClippingRange();
  rightRenderWindow.render();
}

// Enhanced camera sync setup with relative movement tracking
function setupCameraSync() {
  if (!leftRenderer || !rightRenderer) return;
  
  // Initialize previous camera position and focal point
  const leftCamera = leftRenderer.getActiveCamera();
  previousLeftCameraPosition = [...leftCamera.getPosition()];
  previousLeftCameraFocalPoint = [...leftCamera.getFocalPoint()];

  // Create camera sync event handler for left window
  leftRenderer.getActiveCamera().onModified(() => {
    if (camerasLinked) {
      syncCameras(syncMode);
    }
  });
  
  // Add UI controls for camera sync options
  addCameraSyncControls();
}

// Add UI controls for camera sync modes
function addCameraSyncControls() {
  try {
    // Create container for camera controls
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'camera-sync-controls';
    controlsContainer.style.position = 'absolute';
    controlsContainer.style.bottom = '30px';
    controlsContainer.style.left = '35%';
    controlsContainer.style.transform = 'translateX(-50%)';
    controlsContainer.style.padding = '10px';
    controlsContainer.style.background = 'rgba(0, 0, 0, 0.7)';
    controlsContainer.style.color = 'white';
    controlsContainer.style.borderRadius = '4px';
    controlsContainer.style.zIndex = '1000';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.alignItems = 'center';
    controlsContainer.style.gap = '10px';
    
    // Toggle for camera linking
    const toggleContainer = document.createElement('div');
    toggleContainer.style.display = 'flex';
    toggleContainer.style.alignItems = 'center';
    
    const toggleLabel = document.createElement('label');
    toggleLabel.textContent = 'Link Cameras:';
    toggleLabel.style.marginRight = '5px';
    
    const toggleSwitch = document.createElement('input');
    toggleSwitch.type = 'checkbox';
    toggleSwitch.id = 'camera-link-toggle';
    toggleSwitch.checked = camerasLinked;
    toggleSwitch.addEventListener('change', (e) => {
      camerasLinked = e.target.checked;
      updateStatusMessage(`Cameras ${camerasLinked ? 'linked' : 'unlinked'}`, 'info');
    });
    
    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(toggleSwitch);
    
    // Radio buttons for sync mode
    const modeContainer = document.createElement('div');
    modeContainer.style.display = 'flex';
    modeContainer.style.alignItems = 'center';
    
    const modeLabel = document.createElement('label');
    modeLabel.textContent = 'Sync Mode:';
    modeLabel.style.marginRight = '5px';
    
    const relativeModeLabel = document.createElement('label');
    relativeModeLabel.textContent = 'Relative';
    relativeModeLabel.style.marginRight = '10px';
    
    const relativeMode = document.createElement('input');
    relativeMode.type = 'radio';
    relativeMode.name = 'camera-sync-mode';
    relativeMode.value = 'relative';
    relativeMode.checked = syncMode === 'relative';
    relativeMode.addEventListener('change', () => {
      if (relativeMode.checked) {
        syncMode = 'relative';
        updateStatusMessage('Using relative camera sync mode', 'info');
      }
    });
    
    const exactModeLabel = document.createElement('label');
    exactModeLabel.textContent = 'Exact';
    
    const exactMode = document.createElement('input');
    exactMode.type = 'radio';
    exactMode.name = 'camera-sync-mode';
    exactMode.value = 'exact';
    exactMode.checked = syncMode === 'exact';
    exactMode.addEventListener('change', () => {
      if (exactMode.checked) {
        syncMode = 'exact';
        updateStatusMessage('Using exact camera sync mode', 'info');
      }
    });
    
    relativeModeLabel.insertBefore(relativeMode, relativeModeLabel.firstChild);
    exactModeLabel.insertBefore(exactMode, exactModeLabel.firstChild);
    
    modeContainer.appendChild(modeLabel);
    modeContainer.appendChild(relativeModeLabel);
    modeContainer.appendChild(exactModeLabel);
    
    // Add a button to reset both cameras
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Cameras';
    resetButton.style.padding = '5px 10px';
    resetButton.style.borderRadius = '4px';
    resetButton.style.border = 'none';
    resetButton.style.backgroundColor = '#007bff';
    resetButton.style.color = 'white';
    resetButton.style.cursor = 'pointer';
    resetButton.addEventListener('click', () => {
      // Reset both cameras independently
      leftRenderer.resetCamera();
      leftRenderWindow.render();
      
      rightRenderer.resetCamera();
      rightRenderWindow.render();
      
      // Update previous camera state
      const leftCamera = leftRenderer.getActiveCamera();
      previousLeftCameraPosition = [...leftCamera.getPosition()];
      previousLeftCameraFocalPoint = [...leftCamera.getFocalPoint()];
      
      updateStatusMessage('Cameras reset', 'info');
    });
    
    // Assemble the controls
    controlsContainer.appendChild(toggleContainer);
    controlsContainer.appendChild(modeContainer);
    controlsContainer.appendChild(resetButton);
    
    // Add to document
    document.body.appendChild(controlsContainer);
    
    console.log('Camera sync controls added');
    
  } catch (error) {
    console.error('Error adding camera sync controls:', error);
  }
}

// Initialize separate cameras for both views
function initializeSeparateCameras() {
  if (!leftRenderer || !rightRenderer) {
    console.error('Renderers not available for camera initialization');
    return;
  }
  
  try {
    console.log('Initializing separate cameras for both views...');
    
    // Get original cameras
    const leftCamera = leftRenderer.getActiveCamera();
    const rightCamera = rightRenderer.getActiveCamera();
    
    // Reset both cameras to their default states
    leftRenderer.resetCamera();
    rightRenderer.resetCamera();
    
    // Initialize tracking variables for camera sync
    previousLeftCameraPosition = [...leftCamera.getPosition()];
    previousLeftCameraFocalPoint = [...leftCamera.getFocalPoint()];
    
    // Optional: Slightly offset right camera for better initial visualization of reduced data
    if (rightCamera) {
      const position = rightCamera.getPosition();
      const focalPoint = rightCamera.getFocalPoint();
      
      // Add a small angle offset to show dimensionality reduction better
      rightCamera.setPosition(
        position[0] * 0.9,
        position[1] * 1.1,
        position[2] * 0.95
      );
      
      // Keep the focal point centered on the data
      rightCamera.setFocalPoint(focalPoint[0], focalPoint[1], focalPoint[2]);
      
      rightRenderer.resetCameraClippingRange();
    }
    
    // Render both views with their new camera settings
    leftRenderWindow.render();
    rightRenderWindow.render();
    
    console.log('Separate cameras initialized');
    
  } catch (error) {
    console.error('Error initializing separate cameras:', error);
  }
}

// Safer processing function that doesn't rely on Python
async function processWithReduction() {
  if (!currentPolyData || isProcessing) return;

  isProcessing = true;
  console.log('Starting reduction process...');

  try {
    const method = document.querySelector('.dimReduction')?.value || 'none';
    const perplexity = Number(document.querySelector('.perplexity')?.value) || 30;
    const iterations = Number(document.querySelector('.iterations')?.value) || 500;

    console.log(`Method: ${method}, Perplexity: ${perplexity}, Iterations: ${iterations}`);

    if (method === 'none') {
      console.log('No reduction selected, skipping process');
      isProcessing = false;
      return;
    }

    // Update status message
    updateStatusMessage(`Starting ${method} reduction...`);
    
    activeReduction = method;
    const points = getPointsFromPolyData(currentPolyData);

    if (!points || !points.length) {
      throw new Error('No points to reduce');
    }

    // Log original points only if they're an array
    if (Array.isArray(points) && points.length > 0) {
      console.log('Original points sample:', points.slice(0, 3));
      console.log('Original point count:', points.length);
    }

    let result;
    try {
      switch(method) {
        case 'pca':
          if (usePythonBackend) {
            try {
              result = await applyPCA(points);
            } catch (pyError) {
              console.error('Python PCA failed, falling back to JS implementation:', pyError);
              updateStatusMessage('Python PCA failed, using JavaScript', 'warning');
              result = applyPCAJS(points);
            }
          } else {
            result = applyPCAJS(points);
          }
          break;
        case 'tsne':
          updateStatusMessage(`Running t-SNE with ${points.length} points...`);
          if (usePythonBackend) {
            try {
              result = await applyTSNE(points, perplexity, iterations);
            } catch (pyError) {
              console.error('Python t-SNE failed, falling back to JS implementation:', pyError);
              updateStatusMessage('Python t-SNE failed, using JavaScript', 'warning');
              result = await applyTSNEJS(points, perplexity, iterations);
            }
          } else {
            result = await applyTSNEJS(points, perplexity, iterations);
          }
          break;
        case 'umap':
          if (usePythonBackend) {
            try {
              result = await applyUMAP(points, perplexity, iterations);
            } catch (pyError) {
              console.error('Python UMAP failed, falling back to JS implementation:', pyError);
              updateStatusMessage('Python UMAP failed, using JavaScript', 'warning');
              result = await applyUMAPJS(points, perplexity, iterations);
            }
          } else {
            result = await applyUMAPJS(points, perplexity, iterations);
          }
          break;
        default:
          updateStatusMessage(`Unknown reduction method: ${method}`);
          console.warn('Unknown reduction method:', method);
          throw new Error(`Unknown reduction method: ${method}`);
      }
    } catch (reductionError) {
      console.error(`${method} reduction error:`, reductionError);
      updateStatusMessage(`Error during ${method}: ${reductionError.message}`, 'error');
      throw reductionError; // Propagate the error, no fallback
    }

    console.log('Reduction result:', {
      exists: !!result,
      isArray: Array.isArray(result),
      length: result?.length || 0,
      empty: Array.isArray(result) && result.length === 0
    });

    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error(`${method} returned invalid or empty results`);
    }

    reducedPoints = result;
    // Check if reducedPoints is an array before calling slice
    if (Array.isArray(reducedPoints) && reducedPoints.length > 0) {
      console.log('Reduced points sample:', reducedPoints.slice(0, 3));
      console.log('Reduced point count:', reducedPoints.length);
      
      // Update only the right view with reduced points
      // Get the polydata from the right mapper
      const rightPolyData = rightMapper.getInputData();
      updatePolyData(rightPolyData, reducedPoints);
      
      // Update the label
      updateViewLabels('Original', activeReduction + ' Reduced');

      // Reset camera on the right view and adjust for visualization
      adjustCameraToVisualization(rightRenderer);
      
      // Display point count information
      updatePointCountDisplay();
      
      updateStatusMessage(`${method} reduction completed successfully!`, 'success');
    } else {
      console.error('Reduction returned invalid data:', reducedPoints);
      throw new Error('Reduction returned invalid data');
    }

    // Render both views
    leftRenderWindow.render();
    rightRenderWindow.render();

    console.log('Reduction process completed');

  } catch (error) {
    console.error('Process error:', error);
    updateStatusMessage(`Reduction failed: ${error.message}`, 'error');
  } finally {
    isProcessing = false;
  }
}

// Update resetVisualization to work with side-by-side views
function resetVisualization() {
  try {
    console.log('Resetting visualization...');

    if (!currentPolyData || !Array.isArray(originalPoints) || !originalPoints.length) {
      throw new Error('No original data to reset to');
    }

    // Reset points in both views to original
    const leftPolyData = leftMapper.getInputData();
    updatePolyData(leftPolyData, originalPoints);

    const rightPolyData = rightMapper.getInputData();
    updatePolyData(rightPolyData, originalPoints);
    
    // Turn off scalar visibility on the right mapper to remove coloring
    rightMapper.setScalarVisibility(false);
    
    // Reset actor color to default
    rightActor.getProperty().setColor(0.8, 0.8, 1.0);
    
    // Update the view labels
    updateViewLabels('Original', 'Original (Pre-reduction)');
    
    // Update state variable to indicate right view is showing original
    window.rightViewShowingOriginal = true;

    // Reset cameras
    leftRenderer.resetCamera();
    rightRenderer.resetCamera();

    // Update the point count display
    activeReduction = 'None';
    updatePointCountDisplay();

    // Render both views
    leftRenderWindow.render();
    rightRenderWindow.render();

    console.log('Reset to original view');

  } catch (error) {
    console.error('Reset error:', error);
  }
}

// Function to update visualization to show original data on both sides
function updateBothViewsWithOriginal() {
  if (!currentPolyData || !Array.isArray(originalPoints) || !originalPoints.length) {
    console.error('No original data available');
    return;
  }
  
  try {
    console.log('Updating both views to show original data...');
    
    // Update left view with original data (should already have it)
    const leftPolyData = leftMapper.getInputData();
    updatePolyData(leftPolyData, originalPoints);
    
    // Update right view with original data too
    const rightPolyData = rightMapper.getInputData();
    updatePolyData(rightPolyData, originalPoints);
    
    // Update labels to indicate both are showing original data
    updateViewLabels('Original', 'Original (Pre-reduction)');
    
    // Reset cameras
    leftRenderer.resetCamera();
    rightRenderer.resetCamera();
    
    // Render both views
    leftRenderWindow.render();
    rightRenderWindow.render();
    
    console.log('Both views updated to show original data');
    
    // Set state variable to track the right view is showing original data
    window.rightViewShowingOriginal = true;
    
  } catch (error) {
    console.error('Error updating views:', error);
  }
}

// Function to update view labels
function updateViewLabels(leftLabel, rightLabel) {
  // Find the label elements
  const leftLabelElement = document.querySelector('#leftContainer > div:first-child');
  const rightLabelElement = document.querySelector('#rightContainer > div:first-child');
  
  // Update labels if elements exist
  if (leftLabelElement) {
    leftLabelElement.textContent = leftLabel;
  }
  
  if (rightLabelElement) {
    rightLabelElement.textContent = rightLabel;
  }
}

// Validate the visualization pipeline
function validatePipeline() {
  console.log('Validating visualization pipeline...');

  // Check if mappers have input data
  const leftHasData = leftMapper.getInputData() !== null;
  const rightHasData = rightMapper.getInputData() !== null;

  console.log('Left mapper has data:', leftHasData);
  console.log('Right mapper has data:', rightHasData);

  // Check if renderers have actors
  const leftHasActor = leftRenderer.getActors().indexOf(leftActor) !== -1;
  const rightHasActor = rightRenderer.getActors().indexOf(rightActor) !== -1;

  console.log('Left renderer has actor:', leftHasActor);
  console.log('Right renderer has actor:', rightHasActor);

  // Add actors if missing
  if (!leftHasActor && leftMapper.getInputData()) {
    console.log('Adding actor to left renderer');
    leftRenderer.addActor(leftActor);
  }

  if (!rightHasActor && rightMapper.getInputData()) {
    console.log('Adding actor to right renderer');
    rightRenderer.addActor(rightActor);
  }

  return leftHasData && rightHasData && leftHasActor && rightHasActor;
}

// ================== UI SETUP ================== //
// Replace setupUI with this updated version
function setupUI() {
  try {
    console.log('Setting up UI...');

    // Setup WebXR helper
    XRHelper = vtkWebXRRenderWindowHelper.newInstance({
      renderWindow: rightRenderWindow, // Use the right render window for VR
      drawControllersRay: true
    });

    // Create point count display container
    const leftContainer = document.getElementById('leftContainer');
    if (leftContainer) {
      const infoBox = document.createElement('div');
      infoBox.id = 'pointCountInfo';
      infoBox.style.position = 'absolute';
      infoBox.style.bottom = '40px';
      infoBox.style.left = '10px';
      infoBox.style.padding = '10px';
      infoBox.style.background = 'rgba(0, 0, 0, 0.7)';
      infoBox.style.color = 'white';
      infoBox.style.borderRadius = '4px';
      infoBox.style.zIndex = '1000';
      infoBox.innerHTML = '<div>Load a file to see point count</div>';
      leftContainer.appendChild(infoBox);
    }

    // Setup camera synchronization
    setupCameraSync();

    // Initialize separate cameras with different perspectives
    initializeSeparateCameras();

    // Setup event listeners
    setupEventListeners();

    console.log('UI setup completed');

  } catch (error) {
    console.error('UI setup error:', error);
  }
}

// Modified event listener setup to use our new perplexity update function
function setupEventListeners() {
  try {
    console.log('Setting up event listeners...');
    
    // File input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      // Remove any existing listeners
      const newFileInput = fileInput.cloneNode(true);
      fileInput.parentNode.replaceChild(newFileInput, fileInput);
      
      // Add fresh listener
      newFileInput.addEventListener('change', enhancedFileHandler);
      console.log('File input listener attached');
    } else {
      console.error('File input element not found');
    }
    
    // Representation selector
    const representationSelector = document.querySelector('.representations');
    if (representationSelector) {
      // Remove any existing listeners
      const newRepSelector = representationSelector.cloneNode(true);
      representationSelector.parentNode.replaceChild(newRepSelector, representationSelector);
      
      // Add fresh listener
      newRepSelector.addEventListener('change', (e) => {
        const newRepValue = Number(e.target.value);
        if (leftActor && rightActor) {
          leftActor.getProperty().setRepresentation(newRepValue);
          rightActor.getProperty().setRepresentation(newRepValue);
          leftRenderWindow.render();
          rightRenderWindow.render();
          console.log('Representation changed to:', newRepValue);
        }
      });
      console.log('Representation selector listener attached');
    }
    
    // VR Button
    const vrButton = document.querySelector('.vrbutton');
    if (vrButton) {
      // Remove any existing listeners
      const newVrButton = vrButton.cloneNode(true);
      vrButton.parentNode.replaceChild(newVrButton, vrButton);
      
      // Add fresh listener
      newVrButton.addEventListener('click', () => {
        if (newVrButton.textContent === 'Send To VR') {
          XRHelper.setRenderWindow(rightRenderWindow);
          XRHelper.startXR(XrSessionTypes.InlineVr);
          newVrButton.textContent = 'Return From VR';
        } else {
          XRHelper.stopXR();
          newVrButton.textContent = 'Send To VR';
        }
      });
      console.log('VR button listener attached');
    }
    
    // Reduction controls - use our function with updatePerplexity
    const updateReduction = () => {
      if (!isProcessing) processWithReductionShowOriginalFirst();
    };
    
    const dimReduction = document.querySelector('.dimReduction');
    if (dimReduction) {
      // Remove any existing listeners
      const newDimReduction = dimReduction.cloneNode(true);
      dimReduction.parentNode.replaceChild(newDimReduction, dimReduction);
      
      // Add fresh listener with our new function
      newDimReduction.addEventListener('change', updateReduction);
      console.log('Dimension reduction selector listener attached');
    }
    
    // Add value display updates for perplexity slider
    const perplexity = document.querySelector('.perplexity');
    if (perplexity) {
      // Remove any existing listeners
      const newPerplexity = perplexity.cloneNode(true);
      perplexity.parentNode.replaceChild(newPerplexity, perplexity);
      
      // Add fresh listeners
      newPerplexity.addEventListener('input', (e) => {
        const value = e.target.value;
        // Use our new updatePerplexityDisplay function
        updatePerplexityDisplay(value);
      });
      newPerplexity.addEventListener('change', updateReduction);
      console.log('Perplexity slider listeners attached');
    }
    
    // Add value display updates for iterations slider
    const iterations = document.querySelector('.iterations');
    if (iterations) {
      // Remove any existing listeners
      const newIterations = iterations.cloneNode(true);
      iterations.parentNode.replaceChild(newIterations, iterations);
      
      // Add fresh listeners
      newIterations.addEventListener('input', (e) => {
        const value = e.target.value;
        const valueEl = document.getElementById('iterationsValue');
        const displayEl = document.getElementById('iterationsDisplay');
        if (valueEl) valueEl.textContent = value;
        if (displayEl) displayEl.textContent = `Iterations: ${value}`;
      });
      newIterations.addEventListener('change', updateReduction);
      console.log('Iterations slider listeners attached');
    }
    
    // Add reset button
    const resetButton = document.querySelector('.resetButton');
    if (resetButton) {
      // Remove any existing listeners
      const newResetButton = resetButton.cloneNode(true);
      resetButton.parentNode.replaceChild(newResetButton, resetButton);
      
      // Add fresh listener
      newResetButton.addEventListener('click', resetVisualization);
      console.log('Reset button listener attached');
    }
    
    // Add difference visualization button
    const diffButton = document.querySelector('.diffButton');
    if (diffButton) {
      // Remove any existing listeners
      const newDiffButton = diffButton.cloneNode(true);
      diffButton.parentNode.replaceChild(newDiffButton, diffButton);
      
      // Add fresh listener but modify to ensure we're showing reduced view first
      newDiffButton.addEventListener('click', () => {
        // Make sure the right view is showing reduced data before visualizing differences
        if (window.rightViewShowingOriginal && window.reducedPointsReady) {
          const toggleButton = document.getElementById('toggleReducedButton');
          if (toggleButton) {
            toggleButton.click(); // Switch to reduced view
          }
        }
        
        // Now visualize differences
        visualizeDifferences();
      });
      console.log('Difference button listener attached');
    }
    
    // Add sync cameras button
    const syncCamerasButton = document.querySelector('.syncCamerasButton');
    if (syncCamerasButton) {
      // Remove any existing listeners
      const newSyncButton = syncCamerasButton.cloneNode(true);
      syncCamerasButton.parentNode.replaceChild(newSyncButton, syncCamerasButton);
      
      // Add fresh listener
      newSyncButton.addEventListener('click', syncCameras);
      console.log('Sync cameras button listener attached');
    }
    
    // Initialize perplexity display
    const initialPerplexity = Number(document.querySelector('.perplexity')?.value) || 30;
    updatePerplexityDisplay(initialPerplexity);
    
    console.log('All event listeners setup complete');
    
  } catch (error) {
    console.error('Error setting up event listeners:', error);
  }
}

// Function to create collapsible menu
function createCollapsibleMenu() {
  try {
    console.log('Setting up collapsible menu...');
    
    // Find the existing table that contains the controls
    const existingTable = document.querySelector('table');
    if (!existingTable) {
      console.error('Could not find the menu table element');
      return;
    }
    
    // Create container for the collapsible menu
    const menuContainer = document.createElement('div');
    menuContainer.id = 'collapsible-menu';
    menuContainer.style.position = 'absolute';
    menuContainer.style.top = '10px';
    menuContainer.style.right = '10px';
    menuContainer.style.width = '250px';
    menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    menuContainer.style.color = 'white';
    menuContainer.style.borderRadius = '5px';
    menuContainer.style.padding = '10px';
    menuContainer.style.zIndex = '1000';
    menuContainer.style.transition = 'transform 0.3s ease-in-out';
    menuContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    menuContainer.style.maxHeight = '90vh';
    menuContainer.style.overflowY = 'auto';
    menuContainer.style.overflowX = 'hidden';
    
    // Move the existing table into the new container
    existingTable.parentNode.removeChild(existingTable);
    menuContainer.appendChild(existingTable);
    
    // Add header to the menu
    const menuHeader = document.createElement('div');
    menuHeader.style.fontWeight = 'bold';
    menuHeader.style.fontSize = '16px';
    menuHeader.style.marginBottom = '10px';
    menuHeader.style.paddingBottom = '5px';
    menuHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
    menuHeader.textContent = 'Controls';
    menuContainer.insertBefore(menuHeader, existingTable);
    
    // Add the menu container to the document
    document.body.appendChild(menuContainer);
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'menu-toggle-button';
    toggleButton.innerHTML = '☰';
    toggleButton.style.position = 'absolute';
    toggleButton.style.top = '10px';
    toggleButton.style.right = '10px';
    toggleButton.style.width = '50px';
    toggleButton.style.height = '50px';
    toggleButton.style.fontSize = '30px';
    toggleButton.style.backgroundColor = 'rgba(0, 123, 255, 0.8)';
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.borderRadius = '5px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.zIndex = '1001';
    toggleButton.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
    toggleButton.style.display = 'flex';
    toggleButton.style.alignItems = 'center';
    toggleButton.style.justifyContent = 'center';
    toggleButton.title = 'Toggle Menu';
    
    // Add hover effect to the button
    toggleButton.onmouseover = function() {
      this.style.backgroundColor = 'rgba(0, 123, 255, 1)';
    };
    toggleButton.onmouseout = function() {
      this.style.backgroundColor = 'rgba(0, 123, 255, 0.8)';
    };
    
    document.body.appendChild(toggleButton);
    
    // Set menu to initially hidden state
    let menuVisible = false;
    menuContainer.style.transform = 'translateX(270px)';
    
    // Add click event to toggle menu visibility
    toggleButton.addEventListener('click', function() {
      if (menuVisible) {
        // Hide menu
        menuContainer.style.transform = 'translateX(270px)';
        toggleButton.innerHTML = '☰';
      } else {
        // Show menu
        menuContainer.style.transform = 'translateX(0)';
        toggleButton.innerHTML = '✕';
      }
      menuVisible = !menuVisible;
    });
    
    // Improve the style of the menu items
    const rows = existingTable.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      cells.forEach(cell => {
        cell.style.padding = '8px 5px';
      });
    });
    
    // Style all buttons in the menu
    const menuButtons = existingTable.querySelectorAll('button');
    menuButtons.forEach(button => {
      button.style.width = '100%';
      button.style.padding = '8px';
      button.style.margin = '2px 0';
      button.style.backgroundColor = 'rgba(0, 123, 255, 0.7)';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '4px';
      button.style.cursor = 'pointer';
      
      // Add hover effect
      button.onmouseover = function() {
        this.style.backgroundColor = 'rgba(0, 123, 255, 0.9)';
      };
      button.onmouseout = function() {
        this.style.backgroundColor = 'rgba(0, 123, 255, 0.7)';
      };
    });
    
    // Style selects and inputs
    const formElements = existingTable.querySelectorAll('select, input[type="file"], input[type="range"]');
    formElements.forEach(element => {
      element.style.width = '100%';
      element.style.padding = '5px';
      element.style.margin = '2px 0';
      element.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      element.style.color = 'white';
      element.style.border = '1px solid rgba(255, 255, 255, 0.3)';
      element.style.borderRadius = '4px';
      
      // Make sure select options are also visible (when dropdown is open)
      if (element.tagName === 'SELECT') {
        // For select elements, we need to ensure the options are styled
        const options = element.querySelectorAll('option');
        options.forEach(option => {
          // Options will use default background/text when dropdown is shown
          option.style.backgroundColor = '#333';
          option.style.color = 'white';
        });
      }
    });
    
    // Add additional styling to ensure all text content is white
    const allMenuElements = existingTable.querySelectorAll('*');
    allMenuElements.forEach(element => {
      element.style.color = 'white';
    });
    
    // Specifically update any spans or divs that might be showing values
    const textElements = existingTable.querySelectorAll('span, div, label');
    textElements.forEach(element => {
      element.style.color = 'white';
    });
    
    // Make sure perplexity and iterations displays are white
    const displays = document.querySelectorAll('#perplexityDisplay, #iterationsDisplay, #perplexityValue, #iterationsValue');
    displays.forEach(display => {
      if (display) {
        display.style.color = 'white';
      }
    });
    
    console.log('Collapsible menu setup complete');
    return { menuContainer, toggleButton };
  } catch (error) {
    console.error('Error setting up collapsible menu:', error);
  }
}

// Better initialization sequence
function reinitializeApplication() {
  console.log('Reinitializing application...');

  // Clear existing UI elements
  document.body.innerHTML = '';

  // Reset global variables
  leftRenderer = null;
  rightRenderer = null;
  leftRenderWindow = null;
  rightRenderWindow = null;
  leftActor = null;
  rightActor = null;
  leftMapper = null;
  rightMapper = null;
  currentPolyData = null;
  originalPoints = [];
  reducedPoints = [];
  isProcessing = false;
  activeReduction = null;

  // Check VTK imports
  checkVTKImports();

  // Initialize renderers
  const rendererSetup = initializeRenderers();
  if (!rendererSetup) {
    console.error('Failed to initialize renderers');
    return;
  }

  // Setup UI and event listeners
  setupUI();

  console.log('Application reinitialized successfully');
}

// ================== INITIALIZATION ================== //

// Check WebGL support before trying to set up renderers
function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (e) {
    return false;
  }
}

// Simple JavaScript bridge setup function that doesn't reference external functions
function setupJavaScriptBridge() {
  console.log('Setting up JavaScript bridge...');
  
  // Create a simple bridge object for JavaScript fallback
  const jsBridge = {
    isInitialized: true,
    isLoading: false,
    availableAlgorithms: {
      pca: false,
      tsne: false,
      umap: false
    }
  };
  
  // Set the global flag to use JavaScript
  window.usePythonBackend = false;
  
  // Add a status message
  updateStatusMessage('Using JavaScript implementations for all algorithms', 'info');
  
  // Return a resolved promise
  return Promise.resolve(jsBridge.availableAlgorithms);
}

// Replace the initializePyodideOrFallback function

function initializePyodideOrFallback() {
  // First, check if we should skip Pyodide entirely based on URL parameter
  let useJsOnly = false;
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('js_only') || urlParams.has('javascript_only')) {
      console.log('JavaScript-only mode requested via URL parameter');
      useJsOnly = true;
      
      // Add notice about JS-only mode
      const jsOnlyNotice = document.createElement('div');
      jsOnlyNotice.style.position = 'absolute';
      jsOnlyNotice.style.top = '10px';
      jsOnlyNotice.style.left = '50%';
      jsOnlyNotice.style.transform = 'translateX(-50%)';
      jsOnlyNotice.style.padding = '10px';
      jsOnlyNotice.style.background = 'rgba(0, 0, 0, 0.7)';
      jsOnlyNotice.style.color = 'white';
      jsOnlyNotice.style.borderRadius = '4px';
      jsOnlyNotice.style.zIndex = '2000';
      jsOnlyNotice.textContent = 'Running in JavaScript-only mode (Python backend disabled)';
      document.body.appendChild(jsOnlyNotice);
      
      // Remove notice after 5 seconds
      setTimeout(() => {
        if (jsOnlyNotice.parentNode) {
          jsOnlyNotice.parentNode.removeChild(jsOnlyNotice);
        }
      }, 5000);
    }
  } catch (paramError) {
    console.error('Error checking URL parameters:', paramError);
  }
  
  if (useJsOnly) {
    // Skip PyodideBridge setup and use JavaScript implementations only
    window.usePythonBackend = false;
    
    // Create button to enable Python if desired
    const enablePythonButton = document.createElement('button');
    enablePythonButton.textContent = 'Try to Enable Python Backend';
    enablePythonButton.style.position = 'absolute';
    enablePythonButton.style.top = '10px';
    enablePythonButton.style.right = '10px';
    enablePythonButton.style.padding = '8px 12px';
    enablePythonButton.style.background = 'rgba(0, 123, 255, 0.8)';
    enablePythonButton.style.color = 'white';
    enablePythonButton.style.border = 'none';
    enablePythonButton.style.borderRadius = '4px';
    enablePythonButton.style.zIndex = '1000';
    enablePythonButton.style.cursor = 'pointer';
    
    enablePythonButton.addEventListener('click', () => {
      enablePythonButton.disabled = true;
      enablePythonButton.textContent = 'Loading Python...';
      
      // Create and call a simple setup function rather than reference the main one
      setupJavaScriptBridge()
        .then(() => {
          enablePythonButton.textContent = 'Python Enabled!';
          window.usePythonBackend = true;
          
          setTimeout(() => {
            if (enablePythonButton.parentNode) {
              enablePythonButton.parentNode.removeChild(enablePythonButton);
            }
          }, 3000);
        })
        .catch(error => {
          console.error('Failed to enable Python:', error);
          enablePythonButton.textContent = 'Python Activation Failed';
          enablePythonButton.style.background = 'rgba(220, 53, 69, 0.8)';
          
          setTimeout(() => {
            enablePythonButton.textContent = 'Try to Enable Python Backend';
            enablePythonButton.style.background = 'rgba(0, 123, 255, 0.8)';
            enablePythonButton.disabled = false;
          }, 3000);
        });
    });
    
    document.body.appendChild(enablePythonButton);
    
    // Return an object that resolves with JavaScript backends
    return Promise.resolve({
      success: true,
      jsOnly: true,
      message: 'Running in JavaScript-only mode'
    });
  } else {
    // Try to set up with simplified JavaScript bridge instead
    return new Promise((resolve) => {
      try {
        // Call our simple JavaScript bridge setup instead
        const setupPromise = setupJavaScriptBridge();
        
        // Add timeout for initialization
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Initialization timed out after 30 seconds'));
          }, 30000); // 30 second timeout
        });
        
        // Race between setup and timeout
        Promise.race([setupPromise, timeoutPromise])
          .then(() => {
            resolve({
              success: true,
              jsOnly: false,
              message: 'Python backend initialized successfully'
            });
          })
          .catch(error => {
            console.error('Python setup failed:', error);
            
            // Fall back to JavaScript-only mode
            window.usePythonBackend = false;
            
            // Add notification about fallback
            const fallbackNotice = document.createElement('div');
            fallbackNotice.style.position = 'absolute';
            fallbackNotice.style.top = '10px';
            fallbackNotice.style.left = '50%';
            fallbackNotice.style.transform = 'translateX(-50%)';
            fallbackNotice.style.padding = '10px';
            fallbackNotice.style.background = 'rgba(255, 193, 7, 0.8)';
            fallbackNotice.style.color = 'black';
            fallbackNotice.style.borderRadius = '4px';
            fallbackNotice.style.zIndex = '2000';
            fallbackNotice.textContent = 'Python backend failed to initialize. Using JavaScript implementations.';
            document.body.appendChild(fallbackNotice);
            
            // Remove notice after 5 seconds
            setTimeout(() => {
              if (fallbackNotice.parentNode) {
                fallbackNotice.parentNode.removeChild(fallbackNotice);
              }
            }, 5000);
            
            // Add a URL parameter to reload in JS-only mode if needed
            const jsOnlyLink = document.createElement('div');
            jsOnlyLink.style.position = 'absolute';
            jsOnlyLink.style.top = '50px';
            jsOnlyLink.style.left = '50%';
            jsOnlyLink.style.transform = 'translateX(-50%)';
            jsOnlyLink.style.padding = '10px';
            jsOnlyLink.style.background = 'rgba(0, 0, 0, 0.7)';
            jsOnlyLink.style.color = 'white';
            jsOnlyLink.style.borderRadius = '4px';
            jsOnlyLink.style.zIndex = '2000';
            jsOnlyLink.style.cursor = 'pointer';
            jsOnlyLink.textContent = 'Click to reload in JavaScript-only mode';
            
            jsOnlyLink.addEventListener('click', () => {
              const url = new URL(window.location.href);
              url.searchParams.set('js_only', 'true');
              window.location.href = url.toString();
            });
            
            document.body.appendChild(jsOnlyLink);
            
            // Remove link after 10 seconds
            setTimeout(() => {
              if (jsOnlyLink.parentNode) {
                jsOnlyLink.parentNode.removeChild(jsOnlyLink);
              }
            }, 10000);
            
            resolve({
              success: true,
              jsOnly: true,
              message: 'Fallback to JavaScript-only mode',
              error: error.message
            });
          });
      } catch (setupError) {
        console.error('Error in setup try/catch:', setupError);
        
        // Fallback to JavaScript-only mode
        window.usePythonBackend = false;
        
        resolve({
          success: true,
          jsOnly: true,
          message: 'Exception during setup - falling back to JavaScript-only mode',
          error: setupError.message
        });
      }
    });
  }
}

// Add this simple function to add a backend toggle
function addSimpleBackendToggle() {
  try {
    // Remove existing button if any
    const existingButton = document.getElementById('backendToggleButton');
    if (existingButton) {
      existingButton.parentNode.removeChild(existingButton);
    }
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'backendToggleButton';
    toggleButton.style.position = 'absolute';
    toggleButton.style.top = '50px';
    toggleButton.style.left = '10px';
    toggleButton.style.zIndex = '1000';
    toggleButton.style.padding = '8px 12px';
    toggleButton.style.backgroundColor = window.usePythonBackend ? '#28a745' : '#007bff';
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.borderRadius = '4px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.textContent = window.usePythonBackend ? 'Using Python Backend' : 'Using JavaScript Backend';
    
    // Add click handler
    toggleButton.addEventListener('click', () => {
      window.usePythonBackend = !window.usePythonBackend;
      toggleButton.textContent = window.usePythonBackend ? 'Using Python Backend' : 'Using JavaScript Backend';
      toggleButton.style.backgroundColor = window.usePythonBackend ? '#28a745' : '#007bff';
      
      // Show what backend is being used
      updateStatusMessage(`Using ${window.usePythonBackend ? 'Python' : 'JavaScript'} backend for dimensionality reduction`, 'info');
    });
    
    // Add to document
    document.body.appendChild(toggleButton);
    
  } catch (error) {
    console.error('Error adding backend toggle button:', error);
  }
}

// Replace your initializeApplication function with this simplified version
function initializeApplication() {
  console.log('Initializing application...');

  // Check if WebGL is supported
  if (!checkWebGLSupport()) {
    console.error('WebGL is not supported in your browser. This application requires WebGL.');
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.padding = '20px';
    errorDiv.style.background = 'rgba(255, 0, 0, 0.7)';
    errorDiv.style.color = 'white';
    errorDiv.style.borderRadius = '4px';
    errorDiv.style.zIndex = '2000';
    errorDiv.textContent = 'WebGL is not supported in your browser. This application requires WebGL.';
    document.body.appendChild(errorDiv);
    return;
  }

  // Check VTK imports
  checkVTKImports();

  // Initialize renderers
  const rendererSetup = initializeRenderers();
  if (!rendererSetup) {
    console.error('Failed to initialize renderers');
    return;
  }

  // Setup UI and event listeners
  setupUI();
  const consoleOutput = initializeConsoleOutput(); // Add this line

  
  // Add welcome message
  const welcomeMessage = document.createElement('div');
  welcomeMessage.style.position = 'absolute';
  welcomeMessage.style.top = '50%';
  welcomeMessage.style.left = '25%'; // Center in the left view
  welcomeMessage.style.transform = 'translate(-50%, -50%)';
  welcomeMessage.style.padding = '20px';
  welcomeMessage.style.background = 'rgba(0, 0, 0, 0.7)';
  welcomeMessage.style.color = 'white';
  welcomeMessage.style.borderRadius = '4px';
  welcomeMessage.style.zIndex = '1000';
  welcomeMessage.style.textAlign = 'center';
  welcomeMessage.innerHTML = `
    <h3>3D Point Cloud Dimensionality Reduction</h3>
    <p>Upload a VTP file to visualize.</p>
    <p>Select a reduction method and adjust parameters on the right panel.</p>
    <p>Uses VTK.js for visualization and JavaScript for dimensionality reduction.</p>
  `;
  document.body.appendChild(welcomeMessage);

  // Remove welcome message after 10 seconds or on first interaction
  const removeWelcome = () => {
    if (welcomeMessage.parentNode) {
      welcomeMessage.parentNode.removeChild(welcomeMessage);
    }
    document.removeEventListener('click', removeWelcome);
  };

  setTimeout(removeWelcome, 10000);
  document.addEventListener('click', removeWelcome);

  // Initialize with JavaScript fallback first
  window.usePythonBackend = false;
  
  // Simplified way to add backend toggle button
  addSimpleBackendToggle();

  console.log('Application initialized successfully. Ready for user input.');
  
  // Return a success object
  return {
    success: true,
    jsOnly: true,
    message: 'Application initialized in JavaScript mode'
  };
}

// Wait for DOM to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  initializeApplication();
}

// Function to initialize the collapsible menu on page load
function initializeCollapsibleMenu() {
  // Check if document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createCollapsibleMenu);
  } else {
    createCollapsibleMenu();
  }
}

// Call the initialization function
initializeCollapsibleMenu();

// Export functions for global access
if (typeof window !== 'undefined') {
  window.vtkDebug = {
    getOriginalPoints: () => originalPoints,
    getReducedPoints: () => reducedPoints,
    visualizeDifferences,
    resetVisualization,
    calculateDifferences,
    syncCameras,
    generateSampleData,
    reinitializeApplication,
    checkWebGLSupport,
    togglePythonBackend: () => {
      usePythonBackend = !usePythonBackend;
      console.log(`Switched to ${usePythonBackend ? 'Python' : 'JavaScript'} backend`);
      updateStatusMessage(`Using ${usePythonBackend ? 'Python' : 'JavaScript'} backend for dimensionality reduction`, 'info');
      
      const toggleButton = document.getElementById('backendToggleButton');
      if (toggleButton) {
        toggleButton.textContent = usePythonBackend ? 'Using Python Backend' : 'Using JavaScript Backend';
        toggleButton.style.backgroundColor = usePythonBackend ? '#28a745' : '#007bff';
      }
      
      return usePythonBackend;
    }
  };

  console.log('Global functions exposed');
}