This repository contains code used for the WebXR using AR.js and WebAssembly. The project is to demo homography.The homography relates the transformation between two planes and it is possible to retrieve the corresponding camera displacement that allows to go from the first to the second plane view.


Repositories Utilized in this Project

This project is based on the code provided by Edward Lu in the following repository https://github.com/EdwardLu2018/wasm-ar

Project Structure:

|   .gitignore
|   build.sh
|   CMakeLists.txt
|   index.html
|   package-lock.json
|   package.json
|   README.md
|   struct.doc
|   webpack-glsl-minifier.js
|   webpack.config.js
|   
+---dist
|       wasm-ar.js
|       wasm-ar.js.map
|       wasm-ar.min.js
|       
+---emscripten
|       img_tracker_wasm.cpp
|       img_tracker_wasm.hpp
|       utils.cpp
|       utils.hpp
|       
+---html
|       index.html
|       index.js
|       ref.jpg
|       stats.min.js
|       style.css
|       
\---js
    |   grayscale.js
    |   image-tracker.js
    |   img-tracker.worker.js
    |   img_tracker_wasm.js
    |   img_tracker_wasm.wasm
    |   wasm-ar-lib.js
    |   
    \---shaders
            flip-image.glsl
            grayscale.glsl
  

Quick Start

The code consist of file written in html, JavaScript and C++

Index.html is the file used to render the UI. The task of index file to load all the css and JavaScript file. It would load file like stats.min.js, wasm-ar.min.js and index.js. 

These purpose of wasm-ar file is to pass image from video stream as an array from JavaScript to WASM program. Turn the image to grayscale image. Once the image is converted in grayscale it finds its source, width, canvas and height. 

Identity the key points in an image which is particularly distinct and identifies a unique feature. Key points are used to identify key regions of an object that are used as the base to later match and identify it in a new image. The project uses ORB algorithm to identify the keypoints in an image.Find homography matrix by creating and matching ORB descriptor keypoints from reference image to video frame.

After estimating the homography matrix, you can use it to transform points from one image to the other. Given a point (x, y) in the first image,you represen it as a homogeneous coordinate by adding a third coordinate of 1: (x, y, 1). Then, you can apply the homography matrix H to this homogeneous coordinate.  

The initGL initializes the WebGL context and shaders. It compiles and links vertex and fragment shaders, creates buffers, and sets up texture parameters.

Perform image tracking which will give an augment reality or transformation in the form of videos, slideshows, 360° panoramas, sound, text, 3D animations, and more. The project uses Lucas-Kanade tracking algorithm which does Feature Detection: This step is to detect and extract distinctive feature points from the initial frame or region of interest. Once feature detection is done it performs feature tracking,the algorithm attempts to track these points in subsequent frames. Image Gradient Calculation:The algorithm computes the image gradients in the vicinity of each feature point.The algorithm solves the system of linear equations formed by the Lucas-Kanade equation using methods such as least squares or Gaussian elimination. The solution provides an estimate of the motion vector for each feature point.

image_tracker_wasm.cpp: In this we have defined GOOD_MATCH_RATIO with a value of 0.7, which is later used for filtering good matches between keypoints. The codes uses akaze and brute force object matrices for storing reference image data. Initialize the AR system by taking the reference image data and performing AKAZE feature detection and description on it. resetTracking is defined, which takes an image frame as input and performs AKAZE feature detection and description on it. It matches the features with the reference image using a brute-force matcher. If enough good matches are found, it estimates the homography transformation matrix using RANSAC and checks if the homography is valid. then, it fills the output structure with the homography matrix and the warped corner points. A track function is defined, which tracks the image features in subsequent frames using optical flow. It calculates the average variance of the feature points and checks if the number of good matches is sufficient and the variance is within a threshold. If the conditions are met, it estimates an affine transformation matrix, updates the homography matrix, and fills the output structure.


Installation steps:

You will need git, cmake, and python installed.

Install Emsdk:

# Get the emsdk repo
git clone https://github.com/emscripten-core/emsdk.git

# Enter that directory
cd emsdk

# Fetch the latest version of the emsdk (not needed the first time you clone)
git pull

# Download and install the latest SDK tools.
./emsdk install latest

# Make the "latest" SDK "active" for the current user. (writes .emscripten file)
./emsdk activate latest

# Activate PATH and other environment variables in the current terminal
source ./emsdk_env.sh


Install opencv with WebAssembly support:

git clone https://github.com/opencv/opencv.git
cd opencv
python ./platforms/js/build_js.py build_wasm --build_wasm --emscripten_dir=path_to_emscripten


Launch the server using given command

python3 -m http.server

