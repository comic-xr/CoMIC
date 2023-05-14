# An example of README

This repository contains code used for Performance Evaluation of 6DoF Localization with Point Cloud using RGB–D image.

## Repositories Utilized in this Project

This project is based on the colmap code in the follwing repository
<a href="https://github.com/colmap/colmap">Colmap
</a>

This Matlab code is based on the visual slam in the follwing repository
<a href="https://www.mathworks.com/help/vision/ug/visual-slam-with-an-rgbd-camera.html"> Matlab
</a>

The dataset were taken from Redwood RGB-D dataset from the following repository
<a href="http://redwood-data.org/indoor_lidar_rgbd/download.html"> Redwood
</a>

The CloudCompare can be downloaded from the following repository
<a href="https://github.com/CloudCompare/CloudCompare"> CloudCompare
</a>

## Project Strcuture
The following is an example of how to write a project structure

```
Repo Root
+-- ColmapCode.ipynb          # Colmap code to run RGB-D images
+-- MatlabCode.m              # Matlab code for RGB-D images
+-- pose_estimation.py        # for the pose estimation of the camera
```

## Quick Start
Write down how to write your code

* 1 To implement the code for RGB-D point cloud, you need to load the images first. To do that you need to put all RGB images along with the depth image placed next to it in a folder. Your folder should look something like this Eg: rbg_image1.png depth_image1.png rbg_image2.png depth_image2.png rbg_image3.png depth_image3.png....... and load the folder by 

* 2 To implement the code for RGB point cloud, you just need to put all RGB images in a folder.
* 3 This code is to create point clouds using RGB images. The execution time of this code is far less than the colmap. We have taken the code from the above matlab link and made some changes.
* 4 Cloud compare: Cloud compare is the tool used for the representation of pointclouds in 3d and to identify the findings in the point clouds. Here it is used to compare both point clouds i.e. RGB point clouds and RGB-D point clouds and make quantitative and qualitative analysis between both the point clouds. The images in the folder () contains the images of results of the analysis of point clouds that we worked on in cloud compare. 
Localization algorithm:  localization using slam with RGB-D images. Inorder to do this. we need to calculate the pose estimation i.e. Rotation and traslation.


## Note
The approach we took to perform this is :
1)	Feature extraction:
 In the case of 2D images, feature extraction involves analyzing the image to identify certain patterns or features that can be used to distinguish it from other images. Common feature extraction techniques for 2D images include edge detection, corner detection, and blob detection. These techniques are used to identify salient points or regions in the image that can be used for further analysis.
2)	Feature matching:
 In the context of the given problem, there are 1000 features extracted from the localization image and 3000 features extracted from the map image. The goal is to find at most 1000 matched features that have corresponding positions in both images. The output of feature matching is a set of pairs of matched features, where each pair consists of a feature index from the localization image and a feature index from the map image.

3)	Pose estimation:
 In the previous approach, 2D-3D pose estimation was performed using the p3p RANSAC algorithm. This involved using the 2D position of a feature in the localization image, its corresponding 3D position in the map, and camera information to estimate the pose of the camera relative to the map. In the new approach, 3D-3D pose estimation is performed using a new algorithm that involves randomly selecting 4-6 matched features, performing pose estimation, and using the other matched features to calculate the average error. The output of the pose estimation step is the rotation and translation of the camera relative to the map, which is used to transform the 3D positions of the matched features from the localization image to the map. The pose with the lowest average error is returned as the final estimate.
We are working on feature matching and the draft code is named pose_estimation.ipynb. The code is for matching the source and destination points and finding the pose estimation of it. i.e. rotation and translation of it.
Code review:
The function 'p3p_3d_3d' takes two sets of 3D points as input - 'points_3d_src' and 'points_3d_dst'. 'points_3d_src' is the set of 3D points in the camera's view, while 'points_3d_dst' is the corresponding set of 3D points in the world coordinate system.
The function first normalizes the input 3D points to have zero mean and unit variance using the 'mean' and 'std' functions of numpy. This normalization is done to improve the numerical stability and convergence of the algorithm.
Next, the function computes the similarity transform between the normalized 3D points. The similarity transform is a combination of a rotation matrix 'R' and a translation vector 't'. The function first calculates the Homography matrix 'H' by taking the dot product of the normalized source and destination 3D points. The Homography matrix is then decomposed using Singular Value Decomposition (SVD) to obtain the rotation matrix 'R'. Finally, the translation vector 't' is calculated by subtracting the product of the rotation matrix 'R' and the mean of the destination 3D points from the mean of the source 3D points.
The function then returns the estimated rotation matrix 'R' and translation vector 't'. These values can be used to calculate the camera pose in the world coordinate system.

