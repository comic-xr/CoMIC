# An example of README

This repository contains code used for Metastream which is a Volumetric content delivery application code, The main parts of the code Grabing the frames from the Depth camera, Computing the Point cloud from depth data, Computing the client side code and send it to unity.

## Repositories Utilized in this Project
This project is based on the code provided by Ruizhi Cheng.

The Repositories which we used for this project are
1) https://github.com/dusty-nv/jetson-utils
2) https://github.com/dusty-nv/jetson-inference

## Project Strcuture
```
Repo Root
+-- ReadMe.md               # Details regarding the code and project.
+-- src                     # Code  base for the project.
    +-- crop_video.py       # Crop video
    +-- Meta-camera-server.cpp     # Extract the video frame from the video
    +-- Meta-camera-server.cpp   # Sync time between Quest2s
    +-- Meta-camera-server.cpp       # Calculate the E2E latency
    +-- Meta-camera-server.cpp       # Calculate the E2E latency
    +-- Meta-camera-server.cpp       # Calculate the E2E latency
    +-- Meta-camera-server.cpp       # Calculate the E2E latency
```

## Quick Start

* 1 Meta-camera_grab_frames.cpp file is used to get the Frames from the depth camera into bag file you can run the code using the usage print statement in the code.

* 2 Meta-camera_server is the main code for the server module which will be connect to the client through TCP socket, It will convert the RGB-D data to point cloud Data. You can run the code using the usage print statement in the code.

* 3 Meta-camera_Optimized is the main code for the client module for the single camera which will be connect to the Unity and the Server through TCP socket. You can run the code using the usage print statement in the code.

## Note
