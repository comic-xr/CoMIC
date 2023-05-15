# Evaluation of an Inter-Frame Predictive Point Cloud Codec


This repository contains code used for the project "Evaluation Inter-Frame Predictive Point Cloud Compression" for CS695 at George Mason University in Spring 2023 Semester. This project is the performance evaluation of the Inter-Frame Predictive Point Cloud Compression codec which is described in detai in the journal paper(R. Mekuria, K. Blom, and P. Cesar, "Design, Implementation and Evaluation of a Point Cloud Codec for Tele-Immersive Video," IEEE Transactions on Circuits and Systems for Video Technology, 27(4): 828 -842, 2017, of which a preprint is available at: https://ir.cwi.nl/pub/24395.  The codec has served as the software to generate the anchors for the Call for Proposals for Point Cloud Compression by  the MPEG working group 3DG-PCC on PointCloud Compression
(http://mpeg.chiariglione.org/standards/exploration/point-cloud-compression).

This project is based on the two versions of code provided by Kees Blom (Kees.Blom@cwi.nl) in the following repositories: <br>
<a href="https://github.com/cwi-dis/cwi-pcl-codec">Inter-Frame Predictive Point Cloud Codec (2017)
</a><br>
<a href="https://github.com/cwi-dis/cwipc_codec/tree/c607f164b8294133f6a334fe4a3c98262231281a">Inter-Frame Predictive Point Cloud Codec (2021)
</a>

The datasets used in this project can be found in the following links:<br>
<a href="http://vcl.iti.gr/reconstruction/">Dataset 1
</a>
<br>
<a href="http://plenodb.jpeg.org/pc/8ilabs/">Dataset 2
</a>


The above mentioned packages contain:

* codec software (cloud_codec_v2)
* auxiliary files needed (for using 'cmake'  and building 'jpeg_io')
* quality metrics
* evaluation library
* tools for testing and evaluation of several aspects of this codec
* installation instructions

To use it, several dependencies (Boost,Eigen,Flann,QHull,VTK and libjpeg-turbo) need to be installed:  

* for Windows 10, most of this can be done using an all-in-one installer
* for macOS Mojave 14.3 using Homebrew.
* for Ubuntu 18.04 by installing a number of Debian packages
* for all other supported systems by downloading, building and installing PCL and its necessary Third Party Package (TPP's) as described at: http://pointclouds.org/downloads -> 'Compiling from source'.


## Installation:

The complete installation instrustions can be found here: 
<a href="https://github.com/cwi-dis/cwi-pcl-codec/blob/master/README.md#installation">Installation Instructions
</a>

## The evaluation program:

The evaluation program can be <a href="https://github.com/cwi-dis/cwi-pcl-codec/blob/master/README.md#running-the-evaluation-program">run
</a> to get the required outputs from the algorithm.

## Challenges and Errors:

### 2017 Version of the Codec:
**MacOs:**<br>
The project was initiated in 2017 when Apple was still using Intel chipsets. However, currently, most Apple machines utilize their own ARM chipsets, which may or may not have native support for building PCL. Consequently, we had to manually build PCL and all third-party libraries from source on our M1 Pro Mac machine. Despite our efforts, we encountered difficulties in obtaining the "evaluate_compression" application file. We faced a build error with Xcode, where the project built successfully but the application itself couldn't be obtained. As a result, we had to give up on using MacOS and explore other operating systems as alternatives. Establishing a virtual machine on an M1 Mac proved to be a challenging and unreliable process. Unfortunately, there are no reliable virtualization software programs available for constructing a stable build of the required operating system on an M1 Mac.

**Windows:**<br>
At the beginning, we faced difficulties while attempting to build the codec with CMake on Windows. We encountered an error that prevented us from moving forward. The error was that CMake was not able to find the jpeg-turbo library. To solve this issue do the following:

1. Open the CMake GUI (CMake-GUI) application.

2. In the "Where is the source code" field, browse and select the directory where your project's source code is located.

3. In the "Where to build the binaries" field, specify the directory where you want the generated files and Visual Studio Solution to be placed. For example, you can create a "build" directory inside your project's root directory and select that.

4. Click on the "Add Entry" button and add a new entry. In the "Name" column, enter "JPEG_INCLUDES" (without quotes). In the "Type" column, select "Path". In the "Value" column, enter the path to the JPEG includes directory. In this case, it would be "C:/libjpeg-turbo64/include".

5. Add another entry by clicking on the "Add Entry" button again. In the "Name" column, enter "JPEG_LIBRARY" (without quotes). In the "Type" column, select "Path". In the "Value" column, enter the path to the JPEG library file. In this case, it would be "C:/libjpeg-turbo64/lib/turbojpeg-static.lib".

6. Now click on the "Configure" button. A dialog will appear asking you to specify a generator for the project. Select the appropriate generator for your version of Visual Studio and click "Finish".

7. CMake will begin configuring the project based on the provided information. If any errors or warnings appear, you may need to resolve them by adjusting the paths or ensuring that the necessary dependencies are installed.

8. Once the configuration is complete without any errors, click on the "Generate" button. CMake will generate the Microsoft Visual Studio Solution files in the specified "binaries" directory.

9. After the generation is complete, navigate to the specified "binaries" directory using a file explorer. You should find a Microsoft Visual Studio Solution file (.sln) along with other project files.

You can now open the generated Visual Studio Solution file using Microsoft Visual Studio and proceed with building and running your project.


**Ubuntu 18.04:**<br>

After following the above instructions you might get a Cmake error where some of the files would be not found. You can solve the error by doing the following:

1. Open the CMake GUI (cmake-gui) application.

2. In the "Where is the source code" field, specify the directory where the CMakeLists.txt file is located. This is typically the root directory of your project.

3. In the "Where to build the binaries" field, specify an empty directory where you want the generated files and build artifacts to be placed. You can create a separate directory for this purpose. Make sure it is an empty directory.

4. Click on the "Configure" button. A pop-up window titled "CMakeSetup" will appear.

5. In the "CMakeSetup" window, scroll down and select "Unix Makefiles" from the available options. This will ensure that the Makefile generator is used for the build process.

6. Click on the "Finish" button in the "CMakeSetup" window to proceed.

7. CMake will now start the configuration process. It will detect the available build tools and set up the project based on the CMakeLists.txt file.

8. Once the configuration is complete, you will see a list of CMake variables in the CMake GUI.

9. Locate the variable named "JPEG_Turbo_INCLUDE_DIR". In the "Value" column, enter "/usr/include" (without quotes) as the path to the JPEG Turbo include directory.

10. Locate the variable named "JPEG_Turbo_LIBRARY". In the "Value" column, enter "/usr/lib/x86_64-linux-gnu/libjpeg.so" (without quotes) as the path to the JPEG Turbo library file.

11. Click on the "Configure" button again to update the configuration with the new values.

12. Once the configuration is complete without any errors, click on the "Generate" button to generate the build artifacts and Makefile in the specified "Where to build the binaries" directory.

13. After the generation is complete, you can navigate to the specified "Where to build the binaries" directory using a file explorer. You will find the generated Makefile and other build artifacts in this directory.

You can now use the generated Makefile to build your project by running the appropriate build commands (e.g., "make") in the terminal from within the "Where to build the binaries" directory.<br>

We have successfully built and executed the old codec, obtaining intra-frame prediction. However, inter-frame prediction remains elusive despite testing it on different datasets. The predictive algorithm only works for the first frame, and subsequent attempts terminate without results. Modifying the source code proved challenging due to our limited C++ proficiency. We sought assistance from repository maintainers, who recommended exploring an alternative repository with an updated project incorporating the Inter Predictive Coder for better results.


### 2021 Version of the Codec:

We initially thought following the 2017 instructions would suffice, but we later found out that the codec relied heavily on the entire project file, making it necessary to obtain it to run the codec.

**MacOs:**<br>
While configuring the updated codec, we faced a cmake build error with the message "Error in generation process, project files may be invalid." Despite our efforts, we couldn't resolve it. We later found out that some dependencies weren't compatible with the M1 chip, preventing cmake from locating certain required files, as noted by the repository maintainers.

**Ubuntu 22.04:**<br>
To address compatibility issues, we tried running the new codec on a newer version of Ubuntu, as it was specified for proper functionality. However, we faced CMake build errors, particularly related to the libjpeg library. Despite our attempts to manually install and allocate the necessary jpeg libraries to the codec, the issue persisted, and we couldn't resolve the error.



**Windows:**<br>

We successfully built the new codec and obtained an executable file. However, when trying to run it, we faced DLL errors. 
To resolve the error, do the following:

1. Open the `install-3rdparty-full-win1064.ps1` script in a text editor of your choice.

2. Look for comments within the script that indicate what should be added to the system's Path environment variable. Take note of the folders mentioned in these comments.

3. Open the Control Panel on your Windows system.

4. Open `Control Panel` -> `System Properties` -> `Environment Variables` -> `System Variables` -> `Path`.

5. Select the "Path" variable and click on the "Edit" button.

6. Verify that each of the folders mentioned in the script comments exists. If any of the folders are missing, it may indicate an issue during the installation process, and you should investigate and resolve the installation problem before proceeding.

7. Add each folder mentioned in the script comments to the "Path" variable. To add a folder, click on the "New" button and enter the path of the folder. Repeat this step for each folder.

8. After adding the folders, click "OK" to close the dialogs and save the changes.

9. Close all open command prompt windows, bash windows, and PowerShell windows.

10. Re-open the command prompt, bash, or PowerShell windows.

It is crucial to follow these steps to avoid encountering obscure errors later on. Neglecting to add the necessary folders to the system's Path variable may result in errors where Windows cannot find certain DLL files, even though they are present. By ensuring the correct folders are added to the Path, you can prevent these errors from occurring.

Note: It is recommended to use bash for the rest of the build instructions, as it is generally more compatible with the build process compared to CMD or PowerShell.
<br>
<br>
We successfully executed the codec but discovered that the output was identical to the old codec, lacking interframe prediction. This was consistent across all tested codecs. Seeking help, we contacted the codec's author, who had retired since its development. The author intentionally excluded the optional predictive coder in the MPEG version due to unpredictable results depending on the operating system. They investigated the issue and found no simple solution to the numerical problems causing it. Despite this, the predictive coder remained in the repository, in hopes that others could find a way to address the problem and develop a transformation matrix for mapping the point cloud to the next frame.


