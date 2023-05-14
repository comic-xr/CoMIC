# README

This repository contains code used for an E-cigarette Detection Android Application 

## Repositories Utilized in this Project
Indicate all code repositories you have referenced

Example:

This project is based on the code provided by TensorFlow Authors in the follwing repository
<a href="https://colab.research.google.com/github/googlecodelabs/odml-pathways/blob/main/object-detection/codelab2/python/Train_a_salad_detector_with_TFLite_Model_Maker.ipynb#scrollTo=Hm_UULdW7A9T">Train a salad detector with TFLite Model Maker
</a>

This project is based on the code provided by TensorFlower Gardener in the follwing repository
<a href="https://github.com/tensorflow/examples/tree/master/lite/examples/object_detection/android">TensorFlow Lite Object Detection Android Demo
</a>

This project is based on the code provided by  Yi Zhou in the follwing repository
<a href="https://github.com/googlesamples/mlkit/tree/master/android/automl">ML Kit AutoML Remote Model Quickstart Sample App
</a>


## Project Structure
```
Repo Root
+-- e-cig-data.csv                                          # Contains training and testing data for e-cigs
+-- e_cig_detector_tflite_model_maker.py                    # Code to build object detection models
+-- android                                                 # Code to build an E-cig detection app with on device computation 
    +-- app                                                 # Content of application 
            +-- build.gradle
            +-- src
                    +-- main
                            +-- assets
                                    +-- efficientdet-lite0.tflite                               # Object detection model
                                    +-- efficientdet-lite1.tflite                               # Object detection model
                                    +-- efficientdet-lite2.tflite                               # Object detection model
                                    +-- mobilenetv1.tflite                                      # Object detection model
                            +-- java/org/tensorflow/lite/examples/objectdetection
                                    +-- MainActivity.kt                                         # Code for main app
                                    +-- ObjectDetectorHelper.kt                                 # Code for object detection
                                    +-- OverlayView.kt                                          # Code for annotations
                                    +-- fragments
                                            +-- CameraFragment.kt                               # Code for camera 
                                            +-- PermissionsFragment.kt                          # Code for permissions
                                    +-- res                                                     # Files used for UI
                                  
    +-- build.gradle
    
+-- automl                                                # Code to build an E-cig detection app with on server computation 
    +-- app                                               # Content of application 
            +-- build.grade
            +-- src/main                                   
                    +-- java                              # Java code to run backend
                        +-- res
       +-- build.gradle   
```

## Quick Start for E-Cigarette Detection Mobile Application
If you would like to immediately test out the application without running the code, you can download the app-debug.apk on your mobile device from: https://drive.google.com/file/d/1STT3dQ0KwpOR2ixq6KyFAxMa1UUQ9uG3/view?usp=sharing

These are the following components needed to replicate our project. Repeat these steps in the same order to generate the object detection models and apk yourself. 

Steps to create the tflite file (object detection model) 
* 1 Download e-cig-data.csv 
* 2 Upload the .csv file to the same folder as the google colab file titled ‘E-cig Detector TFLite Model Maker’
    * Ensure to have the csv in the same folder as the code – one above sample_data 
* 3 Run each cell in the code 
    * If a cell displays an error, please re-run it
    * Disregard any warnings 
    * Changing the model in the cell under “Train your e-cig detection model” will create different machine learning models 
* 4 This should output a tflite file which will be used in the next portion 

Steps to build the android application 
* 1 Download the android studio project titled /android 
* 2 Unzip it, open android studio, click ‘open’, navigate to and select the unzipped android application folder
* 3 Go to the ‘Build’ tab at the top and select ‘Build Bundle(s) / APK(s)’. 
* 4 This will generate an apk file, and a popup should appear notifying you that it was created successfully, and to locate it somewhere on your computer. 
* 5 Download this apk file on your phone, and once it's downloaded the app should be ready to use.

Optional: To update the tflite files, drop a new tflite file into the /app/assets folders with a name that matches one of the following: mobilenetv1.tflite, efficientdet-lite0.tflite, efficientdet-lite1.tflite, efficientdet-lite2.tflite, mobilenetv1.tflite
* Then rebuild the application with the same steps as above

## Quick Start for E-Cigarette Detection with offloaded server computation

Repeat the following steps to generate the .apk file yourself 

* 1 Download the android /automl project
* 2 Unzip it, open android studio, click ‘open’, navigate to and select the unzipped android application folder
* 3 Before setting up this app to run, you need to create a Firebase project as outlined here. 
    * https://firebase.google.com/docs/android/setup
* 4 Go to the ‘Build’ tab at the top and select ‘Build Bundle(s) / APK(s)’. 
* 5 This will generate an apk file, and a popup should appear notifying you that it was created successfully, and to locate it somewhere on your computer. 
* 6 Download this apk file on your phone, and once it's downloaded the app should be ready to use. 

Note: Due to system dependency issues on our machines, the steps above generate errors for us, however this should be the general correct workflow to follow; though, it may need further debugging. 

