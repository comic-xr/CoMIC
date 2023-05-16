## Heading
This repository contains code used for 3D reconstruction of George Mason University Using COLMAP

This project is based on the code provided by colmap in the following repository
https://colmap.github.io/cli.html

The clmap with GPS position prior is provided by Vincentqyw in the follwing repository
https://github.com/Vincentqyw/colmap-gps

Camera calibration Reference 
https://learnopencv.com/camera-calibration-using-opencv/

## Project Strcuture
Database & Maps

This Project is based on the following database

Link : https://drive.google.com/drive/folders/1bO3PbEiboPKaXBBmnur5CpAcbVO27kR_?usp=sharing

```
The above database consists of three folders namely 
   +-- Research Hall : Images of Research hall building covered in all directions.
   +-- Krug Hall : Images of Kurga Hall building covered in all directions.
   +-- Johnson center : Images of Johnson center building covered in all directions.

```
```
Repo Root
+-- CameraCalibration
    +-- camcal.py                    #camera calibration
    +-- circularpattterncal.py       #camera calibration with circular grid. might be useful in future.

Drive Root
+CS695 
    +-- Johnson center
        +-- sparse                      #consists of Johnson center sparse model.
    +-- Research Hall
        +-- sparse                      #consists of Research Hall sparse model.
    +-- KrugHall
        +-- sparse                      #consists of Krug Hall sparse model.
        

```

## Quick Start
For COLAMP : 

* 1 Install COLMAP and Open Graphic User interface (Hint: use "colmap gui" in Terminal")
* 2 -> File -> Import model
* 3 Navigate to Research Hall -> spare -> 0
* 4 CLick open.


You can follow same method to view Johnson center, If the file consists of multiple files in Sparse (EX : 0,1,2,3)
It indicates that the model is generated in different sets. This happends when colmap is unable to match feature or misses features else it may generate multiple sparse point clouds to handle different parts of the scene separately.

Camera Calibration : 
* 1 Open the camcal.py in Jupyter notebook
* 2 Navigate your Database [Chess board images into code ]  # line 27  ...make sure the extension is correct. (.jpg or .png  doesn't work for .HEIC)
* Run the code get the results

## Note
You can install colmap by downloading file. For MAC users i suggest to go with cloning Githib repo using Homebrew.

You can find the installation process setp by step in colmap.

You can use automatic reconstructor or Manual reconstructor of Sparse maps.

For mac users mostly, generating model (automatic reconstructor)  with Graphic user interface doesn't work. Use command Line argument.

To generate a good sparse model you need close to 25k feature extraction points. But For Mac users with M2 chip you will be limited to 16392 points.

So suggested is to work on Windows machine with a better Graphic card (atleast 8GB).

For camera calibration use your phone camera to take images of chess board from multiple viewpoint points. 
Use them as database to camera calibration.


## Warning
If you update colmap with GPS position Prior, Rarely It affects your global bundle adjustment If it happens remove the GPS position prior code and update it again.

Some phone model does't store GPS information after capturing the image. For example: Google Pixel 7. If so you cannoty use GPS Position Prior, Make sure your image has GPS information.

Installing COLMAP with Homebrew raised a lot of  issues when you have anaconda installed. If there is an issue try removing anaconda and install Homebrew. 

Somehow colmap was not working with anaconda environment and had conflicts with the configurations. 
We explored the code to see what variables and configurations were being used and also realized that we will have to remove anaconda. 
Then we deactivated anaconda and had to reset the whole environment variables and path configurations.
We ran it using the vanilla(standard python pyenv) python virtual environments and then it worked seamlessly on CLI.
