# CMake generated Testfile for 
# Source directory: /home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_import_minver
# Build directory: /home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-build/test/cmake_import_minver
# 
# This file includes the relevant testing commands required for 
# testing this directory and lists subdirectories to be tested as well.
add_test(cmake_import_minver_configure "/home/cs/.local/lib/python3.8/site-packages/cmake/data/bin/cmake" "-G" "Unix Makefiles" "-Dnlohmann_json_DIR=/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-build" "/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_import_minver/project")
set_tests_properties(cmake_import_minver_configure PROPERTIES  FIXTURES_SETUP "cmake_import_minver" _BACKTRACE_TRIPLES "/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_import_minver/CMakeLists.txt;1;add_test;/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_import_minver/CMakeLists.txt;0;")
add_test(cmake_import_minver_build "/home/cs/.local/lib/python3.8/site-packages/cmake/data/bin/cmake" "--build" ".")
set_tests_properties(cmake_import_minver_build PROPERTIES  FIXTURES_REQUIRED "cmake_import_minver" _BACKTRACE_TRIPLES "/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_import_minver/CMakeLists.txt;7;add_test;/home/cs/h1Dev/kinect_teleoperate/_deps/nlohmann_json-src/test/cmake_import_minver/CMakeLists.txt;0;")
