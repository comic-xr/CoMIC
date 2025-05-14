Humanoid Robot: Replay of collected motion trajectories
Students: Marcus Barreto and Venkata Ravi Sridhar Devarakonda

NOTE: Make sure NO ONE is near H1's reach for safety; teleoperation is sometimes unpredictable and erratic.

The code is split in two directories;
1. avp_teleoperat-h1
  This is the directory responsible for the Apple Vision Pro hand-arm teleoperation; the relevant code structure is as follows

avp_teleoperate/
│
├── act                       [Documents Related to ACT Policy for Imitation Learning]
│
├── assets                    [Storage of robot URDF-related files]
│  
├── scripts
│
├── teleop
│   ├── image_server/         [Image Transfer Server and Client Code]
│   │     ├── image_client.py [Client (only used to test whether the image stream service is OK, not used for teleoperation)]
│   │     ├── image_server.py [Capture images from binocular cameras and send via network (performed on Unitree H1_2)]
│   │         
│   ├── robot_control/          [Storage of IK solver, arm and hand control related documents]
│   │      ├── robot_arm_ik.py  [Inverse kinematics of the arm]  
│   │      ├── robot_arm.py     [Control dual arm joints and lock the others]
│   │      ├── robot_hand.py    [Control hand joints]
│   │
│   │──teleop_hand_and_arm.py   [Startup execution code for teleoperation]
|   |——teleop_hand.py           [Can be used for testing the environment configuration]

The code we changed specifically are:
- teleop_hand_and_arm.py (driver code)
- robot_arm.py (code that defines H1 arm command format)
- robot_arm_ik.py (IK translation logic)

To run hand-arm teleoperation:
a. Log in to robot (ssh unitree@192.168.123.162  ;  password = Unitree0408) onto two separate terminals
b. Terminal 1: execute ~/image_server/image_server.py (sudo python image_server.py)
      This will stream images from robot's camera to AVP user.
c. Terminal 2: execute ~/h1_inspire_service-v1.0.2/h1_inspire_service-v1.0.2/h1_inspire_service-master/build/inspire_hand (sudo ./inspire_hand -s /dev/ttyUSB0)
      This will reset H1's hands (close them) and stream H1 hand position to the computer.

d. On computer (connected to H1 via Ethernet), execute teleop_hand_and_arm.py (python teleop_hand_and_arm.py)
      Note: make sure you are using the tv3 environment (conda activate tv3)
      If the code results in "lowstate_subscriber is not ok! Please check dds.", turn off H1 and start over.

e. When the driver code is running, the Apple Vision Pro user (connected to "_LinksysSetup2d2" wifi api) needs to access the web endpoint at https://192.168.123.222:8012?ws=wss://192.168.123.222:8012 and then we have to click the "Enter VR" option in the bottom of the screen

f. When the AVP user is ready, and when the `Please enter the start signal (enter 's' to start the subsequent program):` prompt appears, click 's'; The teleoperation should begin.

For setup info, please refer to https://support.unitree.com/home/en/Teleoperation/avp_teleoperate



2. kinect_teleoperate
   This directory is responsible for the arm-only teleoperation via kinect camera; the movement is smoother than AVP teleoperation.
   The code structure is as follows:
   ├── CMakeLists.txt       [cmake config]
   ├── lib                  [Backup of relevant library files]
   └── src
      ├── CMakeLists.txt
      ├── extern           [GLFW and other third-party libraries]
      ├── kinect_teleoperate_robot
      │   ├── CMakeLists.txt
      │   ├── include           
      │   │   ├── jointRetargeting.hpp      [used to retarget skeletal joint angles to motor joints]
      │   │   ├── math_tool.hpp             [filters and quaternion conversion tools]
      │   │   └── StartEndPoseDetector.hpp  [wake-up action detection code]
      │   └── main.cpp                      [main program code]
      ├── mujoco-3.1.5                      [Mujoco library]
      ├── sample_helper_includes
      ├── sample_helper_libs
      ├── unitree_g1                        [Unitree g1 URDF]
      └── unitree_h1                        [Unitree h1 URDF]


Humanoid Robot: Chatbot powered by LLMs
