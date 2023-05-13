This repository contains codebase used for Collaborative Immersive Analytics powered by IATK

## Repositories Utilized in this Project

This project is based on the code provided by Maxime Cordiel et al in the following repository.
<a href="https://github.com/MaximeCordeil/IATK"> Immersive Analytics ToolKit
<a href=”https://www.photonengine.com/pun”> Photon Unity Networking
<a href=”https://assetstore.unity.com/packages/tools/integration/vrtk-virtual-reality-toolkit-vr-toolkit-64131”> VRTK v4 Tilia Packages from Unity Asset Store
<a href=”https://github.com/ValemVR”> Tutorial for player prehab and designing multiplayer

Short videos on the working prrof:
<a href="https://www.youtube.com/shorts/seVoeseLqx0"> Collaborative space for Immersive Analytics
<a href="https://www.youtube.com/shorts/_KMaJ9v_KLw"> Visualization of Scientific dataset in VR powered by Immersive Analytics Toolkit
</a>
## Project Structure
The following is an example of how to write a project structure.
Repo Root
The following are the main and mandatory dependencies using which the project is build.
+-- Assets           # Contains all the assets, external packages used in creating the Unity project.
	+-- IATK-master    # Github clone of IATK
+-- MapBox          # Externally loaded everything apart the AR dependencies modules.
+-- Photon       # Imported PUN using Photon dashboard post configuring the routing settings.
+-- Resources     # Pre-loaded prehab templates of both hands and head for user designation  
+-- VRTK          # Loaded from Unity Asset Store
+-- Builds             # Builds can be directly load into Quest2 devices using Quest Cable 
+-- ProjectSettings   # Entire project settings dedicated to the Unity project.
 +-- UserSettings       # Entire user settings
## Quick Start
Setting up IATK scene
The project is currently using the VRTK v4 imported scene from the IATK project by Maxime Cordiel which can be changed according to our own dataset by newly configuring the GameObject.
To create a new GameObject and configure the dataset:
•	Insert the dataset into an object
•	Now load the dataset GameObject
•	Create a new VRVisualization with the above loaded gameobject
•	Mention the axes(x,y and z) accordingly.
For multiuser mode:
This project currently supports only 10 users at a time,
The project could be imported as an existing Unity project and after configuring the settings with the Quest 2 device, the PC plays as host server and initiates the session. Any player from the deployed build plays the <build.apk> (found in /Builds) then gets added to the session hosted at the PC.
This does not support any type of interaction among the users for now, yet this functionality can be extended using Photon Voice Chat.

Note: The build version should be the same at the server (PC) and the client (Quest2 devices) ends

## Important Takeaways:
•	Unity Version: 2021.3.8f
•	Please mind the compatibility checks of all the dependencies mainly for Quest Integration and Unity
•	The player prefabs in the Resources folder and other C# scripts can be changed accordingly as per requirements.
Authors:
•	Venkata Chirravuri, Master’s in Computer Science : vchirrav@gmu.edu
•	Varun Muddasani, Master’s in Computer Science: vmuddas@gmu.edu
