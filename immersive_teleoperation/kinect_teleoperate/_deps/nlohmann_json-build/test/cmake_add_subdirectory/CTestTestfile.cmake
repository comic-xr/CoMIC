# CMake generated Testfile for 
# Source directory: /home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_add_subdirectory
# Build directory: /home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-build/test/cmake_add_subdirectory
# 
# This file includes the relevant testing commands required for 
# testing this directory and lists subdirectories to be tested as well.
add_test(cmake_add_subdirectory_configure "/home/cs/.local/lib/python3.8/site-packages/cmake/data/bin/cmake" "-G" "Unix Makefiles" "-Dnlohmann_json_source=/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src" "/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_add_subdirectory/project")
set_tests_properties(cmake_add_subdirectory_configure PROPERTIES  FIXTURES_SETUP "cmake_add_subdirectory" _BACKTRACE_TRIPLES "/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_add_subdirectory/CMakeLists.txt;1;add_test;/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_add_subdirectory/CMakeLists.txt;0;")
add_test(cmake_add_subdirectory_build "/home/cs/.local/lib/python3.8/site-packages/cmake/data/bin/cmake" "--build" ".")
set_tests_properties(cmake_add_subdirectory_build PROPERTIES  FIXTURES_REQUIRED "cmake_add_subdirectory" _BACKTRACE_TRIPLES "/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_add_subdirectory/CMakeLists.txt;7;add_test;/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_add_subdirectory/CMakeLists.txt;0;")
