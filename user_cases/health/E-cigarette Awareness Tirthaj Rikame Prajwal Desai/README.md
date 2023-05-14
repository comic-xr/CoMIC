# E-cigarette-Prevention
Hello!
# This repository contains code used for E-cigarette Awareness Project.
This project is our Final Project for course CS 695.
This project is created by;
# Tirthaj Rikame G01321938
# Prajwal Desai G01321938

# Project Structure
+--- index.html
+--- Blume_warning.html
+--- Diamond_warning.html
+--- Lux_warning.html
+--- Swift_warning.html
+--- Blume_warning.png
+--- Diamond_warning.png
+--- Lux_warning.png
+--- Swift_warning.png


This project consists of Two parts;
# 1. Object Recognition Part
# 2. Augmented Reality Part

# Quick Start
The project works as follows;
(If you run this project, you can fully experience the AR experience using the mobile device(Android or IOS) as our Project uses GPS geo-location.)

#Step 0: 
If you want to train the model on your own, you can do it through this link: https://teachablemachine.withgoogle.com/
Go to Get Started -> Image Project -> Standard Image Model
Add images to the different classes and name the classes accordingly and train it. 
Once the training is completed you can export the model and download it.

To create a warning message we used this website: https://www.adobe.com/express/feature/image/editor
Here you can edit the image according to your liking and while downloading it, download png image with transparent background. 

# Step 1:
Open the link for our project that is hosted onto github to see the live demo on mobile devices
The Link: https://tirthaj.github.io/E-cigarette-Prevention/ 

# Step 2:
Give access to all permissions that the web application asks for, i.e. camera access, location access and AR permission access
After doing that, the camera feed should pop up on your screen and this means that our Object Recognition model has started working.
It keeps scanning for E-cigarettes, and we have kept a 5 second buffer for recognition to help organize the process.

# Step 3:
Once our model recognizes an e-cigarette, then the Augmented Reality part of our code is triggered.
Depending on which e-cigarette is recognized, a custom Augmented Reality warning message is displayed near you which you can see using the camera. For a better experience using AR, use a mobile device(android or ios).







