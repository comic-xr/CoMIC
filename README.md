
# Collaborative VTK.js 3D Visualization Platform
# Test change for pull request
# Another test change for PR

**Category:** Immersive Data Analytics  
**Location:** `use_cases/data_analytics/your_group_folder/`

## Overview

This project implements a real-time collaborative 3D visualization platform using VTK.js and WebSockets. It enables multiple users to join a session, upload and share 3D models (in `.vtp` format), and collaboratively explore scientific data in an immersive environment. The system is designed for seamless late-join synchronization and robust file sharing, making it ideal for remote data analytics and collaborative scientific exploration.

## Contributors

- Krishna Charan Kadiyala  G01445949
- Irfan Shaik  G01445949

## Project Structure

use_cases/data_analytics/your_group_folder/
├── src/
│ ├── index.js # Main client-side application
│ └── index.html # HTML template
├── server.js # Node.js WebSocket server
├── uploads/ # Directory for uploaded files (created at runtime)
├── package.json # Project dependencies and scripts
├── webpack.config.js # Webpack configuration
└── README.md # This documentation

## Features

- **Real-time Collaboration:** All users in a session see the same 3D model and camera view in real time.
- **File Sharing:** Upload a `.vtp` file and it will be broadcast and rendered for all users in the session.
- **Late-Join Synchronization:** New users joining an active session automatically receive and see the current model.
- **Chunked File Transfer:** Large files are split into chunks for reliable transmission and reassembly.
- **Camera Synchronization:** Camera movements are broadcast to all users for a shared exploration experience.
- **User Presence:** See a live list of connected users in your session.

## Getting Started

### Prerequisites

- Node.js (v18.12.0 or higher)
- npm (comes with Node.js)
- A modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

1. **Clone the repository:**
git clone https://github.com/comic-xr/CoMIC.git
cd CoMIC/use_cases/data_analytics/your_group_folder/

2. **Install dependencies:**
npm install

3. **Create the uploads directory (if it doesn't exist):**
mkdir uploads

### Running the Application

1. **Start the WebSocket server:**
node server.js

2. **Start the development server (in a new terminal):**
npm start

3. **Open your browser and join a session:**
http://localhost:8080/?session=mysession&username=yourname

4. **To join from another device or browser, use the same session name:**
http://localhost:8080/?session=mysession&username=teammate

### Usage

- **Upload a 3D Model:** Click the file input to upload a `.vtp` file. The model will be shared with all users in the session.
- **Interact with the Model:** Use mouse controls to rotate, pan, and zoom the model.
- **View Users:** The sidebar displays all connected users.
- **Switch Sessions:** Change the `session` parameter in the URL to create or join different collaborative sessions.

## Technical Details

### Client-Side (`src/index.js`)

- **VTK.js Rendering:** Handles all 3D visualization and interaction.
- **WebSocket Communication:** Manages real-time messaging for file transfer, camera updates, and user presence.
- **File Handling:** Supports both direct and chunked file uploads for efficient sharing.
- **UI Management:** Updates the user list, session info, and file status indicators.

### Server-Side (`server.js`)

- **Session Management:** Groups users by session for isolated collaboration.
- **File Storage:** Saves uploaded files and manages late-join synchronization.
- **Message Routing:** Broadcasts file, camera, and user events to all session members.
- **Chunked File Reassembly:** Reconstructs large files from chunks and ensures delivery to all clients.

### File Transfer Protocol

- **Small Files (<1MB):** Sent directly as base64-encoded strings.
- **Large Files:** Split into chunks, sent sequentially, and reassembled on the server.
- **Late Join:** The server tracks the latest file per session and automatically sends it to new users.

## Troubleshooting

- **Model Not Displayed:** Ensure your browser supports WebGL and the `.vtp` file is valid.
- **User List Not Updating:** Check WebSocket connection in the browser console.
- **File Upload Issues:** Large files may take longer to upload due to chunking.

## Future Improvements

- Annotation tools for collaborative markup
- Support for additional 3D file formats
- Integration with WebXR for immersive VR/AR analytics
- Advanced data filtering and measurement tools

## License

MIT

## Acknowledgments

- [VTK.js](https://kitware.github.io/vtk-js/) - Visualization Toolkit for JavaScript
- [ws](https://github.com/websockets/ws) - WebSocket server for Node.js
- [CoMIC Project](https://github.com/comic-xr/CoMIC) - Collaborative Mixed Initiative Computing

---
