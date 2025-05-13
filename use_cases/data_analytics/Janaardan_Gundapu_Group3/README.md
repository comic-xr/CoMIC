# Immersive Data Analytics
# Janaardan Gundapu
# G01462240
# jgundapu@gmu.edu 


## Project Overview

A web-based, real-time collaborative platform for immersive scientific data visualization and analysis. Built on VTK.js and WebXR, it allows multiple users to:

- Load and explore 3D VTP models  
- Annotate with 3D labels and distance measurements  
- Split the view into synchronized quadrants (quad-view)  
- Enter inline WebXR VR mode  
- Drive the camera with device orientation while keeping the model at a fixed, initial distance  
- Toggle GPU depth testing and insert a test plane for debugging 


## Instructions

1. Install node dependencies from the `dependencies.txt` file:

   ```bash
   xargs npm install < dependencies.txt
   ```
2. Start the server from a separate terminal
   ```bash
   npm run start
   ```
3. Open Google Chrome and go to:
   ```bash
   http://localhost:8080/
   ```
4. Upload a **.vtp** file from the **vtp_files** folder manually.

5. Open Developer Tools in Chrome: Right click > Inspect > WebXR

## Accessing WebXR

### Supported Browsers
- **Google Chrome** (Recommended)
- **Microsoft Edge**
- **Firefox Nightly**

### Browser Settings
Before running the WebXR experience, enable the following flags in Chrome/Edge:
1. Open `chrome://flags` (or `edge://flags` in Edge).
2. Enable **WebXR**.
3. Enable **WebGL 2.0**.
4. Restart the browser.

### Entering VR Mode
1. Click the **'Enter VR'** button.
2. Put on your VR headset and enjoy the experience!


### Change representation
Use the Representation dropdown to switch rendering modes.

### Widgets

Label: Place 3D text annotations.

Line: Measure distances between two points.

Axes overlays

Bottom-left: 3-axis overlay

Bottom-right: Annotated cube

Quad-view
Click Enable Quad View to split into four synchronized cameras; Disable to revert.

VR mode
Click Enter VR to go into inline WebXR; Exit VR to return.

Device-orientation mode
Click Enable Device Orientation (grant permission or emulate in DevTools).
The model stays at its original distance directly in front of your view.
Click Disable Device Orientation to stop.

Depth test
Toggle GPU depth testing with Enable / Disable Depth Test.

Test-plane helper
In the browser console, call addTestPlane() to insert a green plane.

## Keyboard controls

Arrow keys: rotate camera

W / S: zoom in / out

