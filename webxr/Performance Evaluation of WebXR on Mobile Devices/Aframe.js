<!DOCTYPE html>
<html>
<head>
  <title>WebXR Demo</title>
</head>
<body>
  <a-scene>
    <a-entity id="camera" position="0 0 0">
      <a-vr-headset>
        <a-xr-session id="session"></a-xr-session>
      </a-vr-headset>
    </a-entity>
    <a-entity position="0 0 1">
      <a-box width="1" height="1" depth="1" color="red"></a-box>
    </a-entity>
  </a-scene>

  <script src="https://aframe.io/releases/1.0.7/aframe-all.min.js"></script>
  <script src="https://unpkg.com/webassembly-loader@0.10.4/dist/webassembly-loader.js"></script>
  <script src="your-wasm-file.wasm"></script>

  <script>
    function init() {
      // Create a WebXR session.
      var session = document.getElementById("session");
      session.addEventListener("sessionstart", function() {
        // The session is ready.
        console.log("Session started.");
      });

      // Load the WebAssembly module.
      WebAssembly.instantiateStreaming(fetch("your-wasm-file.wasm"), {
        eager: true,
      }).then(function(wasm) {
        // Create a WebAssembly instance.
        var instance = wasm.instance;

        // Create a WebXR controller.
        var controller = new XRController(session);

        // Register a callback to be called when the controller changes.
        controller.addEventListener("change", function() {
          // Update the WebAssembly instance with the controller's state.
          instance.update(controller.state);
        });

        // Start rendering the scene.
        scene.render(function() {
          // Update the controller.
          controller.update();
        });
      });
    }

    // This code is called when the page loads.
    window.addEventListener("load", init);
  </script>
</html>