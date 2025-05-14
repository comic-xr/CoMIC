# 3D Point Cloud Dimensionality Reduction Visualization

A web-based platform for interactive visualization and analysis of 3D point cloud data with real-time dimensionality reduction. This tool allows users to explore high-dimensional data through visualization, apply various dimensionality reduction techniques, and compare original and reduced data.


## Features

- **Interactive 3D Visualization**: Side-by-side views for comparing original and reduced data
- **Multiple Dimensionality Reduction Methods**: PCA, t-SNE, and UMAP implementations
- **Dual-Engine Processing**: JavaScript implementations for maximum compatibility and Python (via Pyodide) for performance
- **Difference Visualization**: Color-coded display of dimensional reduction impact
- **VR Support**: Immersive data exploration with WebXR
- **File Format Support**: Import data from VTP, CSV, or TXT files
- **Parameter Adjustment**: Real-time control of reduction parameters
- **Camera Synchronization**: Linked or independent camera controls
- **Responsive UI**: Collapsible menu system for distraction-free visualization

## Setup and Installation

### Prerequisites

- Node.js (14.x or later recommended)
- NPM (6.x or later)
- Modern web browser (Chrome/Edge recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dimensional-reduction-viz.git
   cd dimensional-reduction-viz
   ```

2. Install dependencies:
   ```bash
   xargs npm install < dependencies.txt
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:9000/
   ```

## Usage Instructions

### Loading Data

1. Launch the application as described in the installation section
2. Click the "Choose File" button in the right-side control panel
3. Select a supported file (.vtp, .csv, or .txt)
4. Your data will be loaded and displayed in both view panels

### Applying Dimensionality Reduction

1. From the dropdown menu, select a dimensionality reduction method:
   - **PCA**: Fast linear dimensionality reduction
   - **t-SNE**: Non-linear reduction that preserves local relationships
   - **UMAP**: Efficient manifold learning technique for dimensionality reduction

2. Adjust the parameters as needed:
   - **Iterations**: Higher values may improve results but take longer
   - **Perplexity**: (For t-SNE) Controls the balance between local and global structure

3. The reduction will automatically begin after selecting a method
4. When complete, the right view will display your reduced data
5. Click "Show Reduced Data" to view the results (if not automatically shown)

### Visualizing Differences

1. After applying a dimensionality reduction, click the "Show Differences" button
2. The right view will display a color-coded visualization:
   - **Blue**: Low dimensional reduction difference
   - **Green**: Moderate difference
   - **Yellow**: Elevated difference
   - **Orange**: High difference
   - **Red**: Severe difference

### Camera Controls

- **Left-click + drag**: Rotate the view
- **Right-click + drag**: Pan the view
- **Mouse wheel**: Zoom in/out
- **Camera sync toggle**: Link/unlink camera movements between views
- **Reset View**: Reset the camera to the default position

### Changing Display Mode

Use the "Representations" dropdown to change the visualization style:
- **Points**: Display data as individual points
- **Wireframe**: Display as a wireframe mesh
- **Surface**: Display as a solid surface

### VR Mode

1. Ensure your browser has WebXR enabled (see browser settings below)
2. Connect a VR headset
3. Click "Send To VR" to enter immersive view
4. Return to desktop view by clicking "Return From VR" or exiting VR mode on your headset

#### Browser Settings for VR
1. Open `chrome://flags` (or `edge://flags` in Edge)
2. Enable **WebXR Device API**
3. Enable **WebXR Layers**
4. Restart your browser

## JavaScript vs Python Backend

The application offers two computational backends:

- **JavaScript**: Works on all browsers without additional dependencies. Best for smaller datasets and maximum compatibility.
- **Python (via Pyodide)**: Offers potentially better performance for larger datasets but requires additional loading time. May not work in all environments. Gave Provision for improvements

Toggle between backends using the backend switch button.

## Troubleshooting

### Common Issues

1. **Visualization not appearing**:
   - Ensure WebGL is enabled in your browser
   - Try a different browser (Chrome or Edge recommended)
   - Check that your graphics drivers are up to date

2. **Python backend fails to load**:
   - The application will automatically fall back to JavaScript
   - Ensure you have a stable internet connection (required to download Pyodide)
   - Try reloading the page

3. **Performance issues with large datasets**:
   - Try using the Python backend for better performance
   - Reduce the number of points by sampling your data
   - Switch to "Points" representation instead of "Surface"

#### Detailed WebXR Setup

If encountering WebXR errors:

1. In Chrome/Edge, navigate to: `chrome://flags` or `edge://flags`
2. Search for and ENABLE these flags:
   - WebXR Device API
   - WebXR Gamepad Support
   - WebXR Layers
   - WebXR Incubations
   - OpenXR support (if available)
3. Restart your browser completely
4. Ensure your headset is in developer mode (required for some devices)
5. Verify your system meets the minimum requirements for WebXR

### Performance Tips

1. For large point clouds (>100,000 points):
   - Use PCA instead of t-SNE/UMAP initially
   - Reduce iterations for faster results
   - Consider downsampling your data

2. For best t-SNE results:
   - Start with perplexity values between 5-50
   - Use 500-1000 iterations for more stable results
   - Be patient - t-SNE can take time to converge

## Technical Details

This application uses:
- **VTK.js**: For 3D visualization
- **ml-pca**: For JavaScript PCA implementation
- **tsne-js**: For JavaScript t-SNE implementation
- **umap-js**: For JavaScript UMAP implementation
- **Pyodide**: For running Python scientific libraries in the browser
- **WebXR**: For VR support

## License

[MIT License](LICENSE) - Feel free to use, modify, and distribute as needed.

## Acknowledgements

- VTK.js team for the visualization framework
- Pyodide project for bringing Python to the browser
- Contributors who helped build and test this tool