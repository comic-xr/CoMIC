# WebXR-application

Performance Evaluation of WebXR on Mobile Devices

Created a WebXR site with HTML, CSS, JS and A-Frame. 

The files contains JS files which are created for 3D animations. And hosted the sites in glitch in assests and loaded the animations inside the html file under src. 

This application is developed on Glitch IDE. All the files are copied from Glitch to git. Please test the application using glitch as it has all neccssary animations.

Code link from Glitch : https://glitch.com/edit/#!/mud-midi-screwdriver. 

## WebXR integration with WebAssembly. 

1. For integrating WebAssembly, we have created as wsam js file and hosted the application in glitch and loaded in wsam.js file uisng fetch. We have created the wsam binary file ( complied the code) using Emscripten tool. 

2. Emscripten is a widely-used toolchain that allows you to compile C/C++ code into WebAssembly. It leverages LLVM and provides a comprehensive set of tools and libraries for working with WebAssembly.

3. We have followed the JavaScipt API for WebAssembly ( Please follow the references)  

4. Before loading the application using the binary file we have to host the wsam binary. We have used the glitch platform for hosting. 

## File structure: 

Js files: 

Backhome
componentstarter
examplefunctions
sphereexpand
wsam-module
Aframe

HTML and A-Frame: 

index

## References: 

https://developer.mozilla.org/en-US/docs/WebAssembly/Using_the_JavaScript_API

https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface

https://caniuse.com/wasm  (Used for checking the compatability for WebAssembly) 
