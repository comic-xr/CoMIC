
# AR Business Card

The application is created in Unity
Steps:
1.	Install Unity- Download Editor inside it. Select version 2022.2.7fl (I have selected this one)
2.  choose Android platform
3.  open the Unity Hub and select “Open C# project"
4.  write the code
5.  import the assets of your choice in unity
6.  Once, above steps are done,proceed with device integration. Connect the device using type C to the phone device

Unity Profiler:
1.  Open Unity project and click on the "Window" menu at the top of the screen. 
2.  Click on "Analysis" and then select "Profiler" from the dropdown menu.  The Profiler window will open. By default, it shows the CPU usage graph. Use the tabs at the top of the window to switch between different graphs
3.  Inorder to start profiling, click on the "Record" button at the top of the Profiler window.  Application will start running and the Profiler will begin collecting data. 
4.  Once you've finished profiling, click on the "Stop" button to end the recording. 

WebAssembly:
1.  converted the function "OnTrackedImagesChanged" c# to c and compiled in Emscripten to create .wasm binary file
Emscripten is a complete compiler toolchain to WebAssembly, using LLVM, with a special focus on speed, size, and the Web platform.
2.  Hosted .wasm file in Glitch which can be accessed in our code
.wasm file: https://cdn.glitch.global/fae4f3fc-0f15-4ca3-8e80-0e9d5a5ac871/3DCards.wasm?v=1684025140876
3.  Hosted the application in EC2 instance
4.  Used chrome dev tools to measure the metrics

References: 
https://docs.unity3d.com/Manual/index.html
https://developer.mozilla.org/en-US/docs/WebAssembly/C_to_wasm
https://caniuse.com/wasm