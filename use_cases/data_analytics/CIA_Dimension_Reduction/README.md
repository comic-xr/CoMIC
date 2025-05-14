# CIA_Web


## Project Overview

A web-based, real-time collaborative platform for immersive scientific data visualization and analysis, leveraging advanced technologies for multi-user interaction and high-dimensional data exploration.

## Instructions

1. Install node dependencies from the `dependencies.txt` file:

   ```bash
   xargs npm install < dependencies.txt
   ```

2. Start the server from terminal
   ```bash
   npm start
   ```
3. Open Google Chrome and go to:
   ```bash
   http://localhost:9000/
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
