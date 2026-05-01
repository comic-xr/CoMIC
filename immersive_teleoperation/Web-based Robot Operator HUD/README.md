# Web-based Robot Operator HUD

## Team Members
- Srijan
- Aditya

## Project Overview
The Web-based Robot Operator HUD is a professional, tactical interface designed for the immersive teleoperation of humanoid robots and uncrewed vehicles. This system provides a comprehensive Heads-Up Display (HUD) that aggregates live telemetry, environmental hazard data, real-time AI object tracking, and an NLP-filtered radio intercept feed into a single, cohesive situational awareness tool. Built for high-stress scenarios, the interface minimizes cognitive load while maximizing critical data throughput.

## Features
- **Tactical Visual Modes**: Switch between Standard Optical, NVG (Night Vision), FLIR (Thermal), and LiDAR simulations for varied operational environments.
- **Real-Time AI Object Tracking**: Integrated TensorFlow.js (COCO-SSD) to automatically detect and highlight personnel in the live video feed.
- **Environmental Hazard Monitoring**: Simulated real-time telemetry for O2/CO2 levels, accompanied by critical visual and audible alerts when thresholds are breached.
- **NLP-Filtered Communications**: Scans incoming simulated radio intercepts for critical keywords (e.g., "casualty", "fire") and flags them for the operator.
- **Voice-Activated Commands**: Hands-free operation using the Web Speech API to change vision modes, query AI target counts, or mute alarms.
- **Live Geolocation & Telemetry**: Integrates with Leaflet for real-time tactical mapping alongside battery and network latency monitoring.

## Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (Custom Properties, CSS Grid/Flexbox), JavaScript (ES6 Modules)
- **Backend**: Node.js with Express
- **AI/ML**: TensorFlow.js (COCO-SSD model for real-time inference)
- **Local LLM**: Ollama for voice-command decoding, summaries, and co-pilot chat
- **APIs**: Web Speech API (Speech Recognition/Synthesis), Web Audio API, Geolocation API, Battery Status API

## How to Run the Project
1. Install dependencies with `npm install`.
2. Start the local server with `npm start`.
3. Open `http://127.0.0.1:8080` in a browser.
4. Allow camera and microphone permissions when prompted for full feature functionality.
5. For LLM-backed voice decoding and summaries, make sure Ollama is running locally on `http://127.0.0.1:11434`.

## Folder Structure
```text
Web-based Robot Operator HUD/
│
├── css/                   # Modular CSS stylesheets (layout, components, alerts)
├── js/                    # JavaScript ES6 Modules
│   ├── comms/             # Radio intercept and NLP filtering logic
│   ├── data/              # Mock telemetry and transmission data
│   ├── sensors/           # GPS, Battery, and Hazmat simulation
│   ├── utils/             # Audio synthesis utilities
│   ├── vision/            # Webcam feed and TensorFlow.js object tracking
│   ├── voice/             # Speech recognition command processing
│   └── app.js             # Main application entry point
├── index.html             # HUD structure and layout
└── README.md              # Project documentation
```

## Future Improvements
- **Backend Integration**: Replace simulated telemetry with WebSockets connected to a physical robot (ROS/ROS2 bridge).
- **Advanced NLP**: Upgrade the basic keyword filtering to a localized LLM for deeper semantic understanding of radio traffic.
- **Multi-Camera Support**: Allow toggling between multiple camera feeds (e.g., chassis, arm, rear view).
- **Persistent Settings**: Save operator preferences (color themes, layout arrangements) using LocalStorage.
