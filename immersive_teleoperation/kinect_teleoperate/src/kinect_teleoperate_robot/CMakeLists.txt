# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

#Note, this CMake had to be modified from original version to get main.cpp to compile with
#GMU's lab 4901 Ubuntu computer and its utilities.

add_compile_options(-std=c++17)
set(CMAKE_BUILD_TYPE Release)
# Eigen
find_package(Eigen3 3.3 REQUIRED NO_MODULE)
find_package(glfw3 REQUIRED)

set(MuJoCo_Include_Dir ${CMAKE_CURRENT_SOURCE_DIR}/../mujoco-3.1.5/include)
set(MuJoCo_Library_Dir ${CMAKE_CURRENT_SOURCE_DIR}/../mujoco-3.1.5/lib)
set(MuJoCo_Libraries mujoco)

set(CMAKE_PREFIX_PATH "/opt/unitree_robotics")

link_directories(
    ${MuJoCo_Library_Dir}
    ${hx_idl_cpp_Include_Dir}
)

add_library(window_controller_3d STATIC
    ../sample_helper_libs/window_controller_3d/WindowController3d.cpp
    ../sample_helper_libs/window_controller_3d/Window3dWrapper.cpp
    ../sample_helper_libs/window_controller_3d/ViewControl.cpp
    ../sample_helper_libs/window_controller_3d/PointCloudRenderer.cpp
    ../sample_helper_libs/window_controller_3d/FloorRenderer.cpp
    ../sample_helper_libs/window_controller_3d/SkeletonRenderer.cpp
    ../sample_helper_libs/window_controller_3d/RendererBase.cpp
    ../sample_helper_libs/window_controller_3d/glad/glad.c  # if using glad for OpenGL
    # Add more source files if needed
    ../sample_helper_libs/window_controller_3d/Helpers.cpp                       
    ../sample_helper_libs/window_controller_3d/Sphere.cpp           
    ../sample_helper_libs/window_controller_3d/Cylinder.cpp        
    ../sample_helper_libs/window_controller_3d/CoordinateAxes.cpp 
)


add_executable(kinect_teleoperate main.cpp)

target_include_directories(kinect_teleoperate 
    PRIVATE 
    ../sample_helper_includes/ #This is where BodyTrackingHelpers.h is
    ../sample_helper_libs/window_controller_3d
    /opt/unitree_robotics/include/ddscxx
    ${MuJoCo_Include_Dir}
    include/
    /opt/unitree_robotics/include
    /home/cs/h1Dev/unitree_sdk2/include
)



# Dependencies of this library
target_link_libraries(kinect_teleoperate PRIVATE 
    
    k4a
    k4abt
    k4arecord
    window_controller_3d::window_controller_3d
    ${MuJoCo_Libraries}
    /home/cs/h1Dev/unitree_sdk2/lib/x86_64/libunitree_sdk2.a
    Eigen3::Eigen
    pthread
    /opt/unitree_robotics/lib/libddscxx.so         # C++ binding
    /opt/unitree_robotics/lib/libddsc.so 
    dl
)

target_include_directories(window_controller_3d PUBLIC
    ../sample_helper_libs/window_controller_3d
    ../sample_helper_includes  
)

# Try linking with imported target, fallback to raw name
if(TARGET glfw::glfw)
    target_link_libraries(kinect_teleoperate PRIVATE glfw::glfw)
else()
    target_link_libraries(kinect_teleoperate PRIVATE glfw)
endif()