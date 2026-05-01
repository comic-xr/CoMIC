/**
 * 3D Topological Path Tracker
 * Replaces the 2D map with a Three.js WebGL renderer that paints a
 * glowing neon vector trail directly onto a tactical cyber-grid.
 */

export function initGeolocation() {
    const elCoordX = document.getElementById("coord-x");
    const elCoordY = document.getElementById("coord-y");
    const container = document.getElementById('tactical-map-container');
    
    // Clear container explicitly to ensure no artifact HTML persists
    container.innerHTML = "";
    
    // Safety check for Three.js
    if (typeof THREE === 'undefined') {
        console.error("Three.js dependency is missing. Cannot render map.");
        return;
    }

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010306);
    scene.fog = new THREE.Fog(0x010306, 5, 25);

    // 2. Camera Configuration
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 3, 6);
    camera.lookAt(0, 0, 0);

    // 3. Renderer Initialization
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 4. Topological Grid Floor
    const gridHelper = new THREE.GridHelper(50, 25, 0x00ffcc, 0x113333);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // 5. Ghost Path Geometry
    const MAX_POINTS = 400; // Cap at 400 nodes so mobile devices don't lag over long sessions
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_POINTS * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({ color: 0x00ffcc, linewidth: 2 });
    const line = new THREE.Line(geometry, material);
    scene.add(line);

    // 6. 3D Target Marker (Robot Position)
    const markerGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const robotMarker = new THREE.Mesh(markerGeo, markerMat);
    scene.add(robotMarker);

    // ----- Telemetry Core State -----
    let drawCount = 0;
    let currentPos = new THREE.Vector3(0, 0, 0);

    // Simulator Constants for HUD display
    let speed = 1.8;
    let pitchOffset = 0;
    let yawOffset = 0; 
    let frameId = 0;

    function addPoint(v) {
        if (drawCount < MAX_POINTS) {
            positions[drawCount * 3] = v.x;
            positions[drawCount * 3 + 1] = v.y;
            positions[drawCount * 3 + 2] = v.z;
            drawCount++;
            geometry.setDrawRange(0, drawCount);
            geometry.attributes.position.needsUpdate = true;
        } else {
            // Shift array backwards gracefully forming a rolling 3d trail window
            for (let i = 0; i < MAX_POINTS - 1; i++) {
                positions[i * 3] = positions[(i + 1) * 3];
                positions[i * 3 + 1] = positions[(i + 1) * 3 + 1];
                positions[i * 3 + 2] = positions[(i + 1) * 3 + 2];
            }
            positions[(MAX_POINTS-1)*3] = v.x;
            positions[(MAX_POINTS-1)*3+1] = v.y;
            positions[(MAX_POINTS-1)*3+2] = v.z;
            geometry.attributes.position.needsUpdate = true;
        }
    }

    function animate() {
        frameId = requestAnimationFrame(animate);
        
        // 1. Telemetry Drift Equation
        currentPos.x += Math.sin(yawOffset) * (speed * 0.015);
        currentPos.z -= Math.cos(yawOffset) * (speed * 0.015);
        currentPos.y = Math.sin(frameId * 0.03) * 0.4 + pitchOffset; 
        
        yawOffset += (Math.sin(frameId * 0.01) * 0.005);
        
        robotMarker.position.copy(currentPos);
        addPoint(currentPos);

        // 2. Tactical Camera Tracking
        const cameraOffset = new THREE.Vector3(Math.sin(yawOffset)*4, 2.5, Math.cos(yawOffset)*4);
        camera.position.lerp(currentPos.clone().add(cameraOffset), 0.05);
        camera.lookAt(currentPos);

        // 3. Inject back into Data UI
        elCoordX.innerText = currentPos.x.toFixed(4);
        elCoordY.innerText = (-currentPos.z).toFixed(4);
        document.getElementById("speed").innerText = speed.toFixed(1) + " m/s";
        document.getElementById("pitch").innerText = (currentPos.y * 10).toFixed(1) + "°";
        document.getElementById("yaw").innerText = (yawOffset * (180/Math.PI) % 360).toFixed(1) + "°";

        renderer.render(scene, camera);
    }
    
    animate();

    window.addEventListener('resize', () => {
        if(container.clientWidth > 0 && container.clientHeight > 0) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    });
}
