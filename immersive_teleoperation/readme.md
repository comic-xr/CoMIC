Humanoid Robot: Replay of collected motion trajectories
Students: Marcus Barreto and Venkata Ravi Sridhar Devarakonda

NOTE: Make sure NO ONE is near H1's reach for safety; teleoperation is sometimes unpredictable and erratic.

The code is split in two directories;
1. avp_teleoperat-h1
  This is the directory responsible for the Apple Vision Pro hand-arm teleoperation; the relevant code structure is as follows

![image](https://github.com/user-attachments/assets/71a21b11-6d89-4f8f-8b50-0fd3674d381d)

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
      To end the teleoperation, simply hit ctrl-C (^C)

For setup info, please refer to https://support.unitree.com/home/en/Teleoperation/avp_teleoperate

Here is a video of teleoperation with AVP: https://drive.google.com/file/d/19RjfZ9_660kgiYIy4TJiJ0mGHlTos2Ps/view?usp=sharing

NOTE: the right hand of H1 unit (specifically its thumb) is damaged, so users should avoid using the right hand in hand control until it is fixed/replaced.


2. kinect_teleoperate
   This directory is responsible for the arm-only teleoperation via kinect camera; the movement is smoother than AVP teleoperation.
   The code structure is as follows:
   ![image](https://github.com/user-attachments/assets/fd3a302b-14ae-469d-98af-536cacaed50c)

main.cpp (driver/logic code) is the only file of interest; but we did have to change CMakeLists.txt significantly for the lab computer to compile correctly.

To run arm teleoperation:
a. Make sure the kinect camera is connected to computer (USB)

b. run the 'kinect_teleoperate' in kinect_teleoperate/src/kinect_teleoperate_robot/build
    To build executable, run "Cmake .. -GNinja", then "ninja" from the build directory.

c. Have someone stand in front of camera; once they are in the ready position (pose matching H1 simulator model), teleoperation will begin
![image](https://github.com/user-attachments/assets/d52873dc-2c62-4473-bd83-7a08d2b37bfe)

NOTE: When teleoperation begins, the H1 will SUDDENLY go from hanging slack to the ready state and moving with the kinect user. 

For setup info, please refer to https://support.unitree.com/home/en/Teleoperation/kinect_teleoperate

Here is a video of Kinect teleoperation in action:
https://drive.google.com/file/d/1x1ipnGIySA6PTLOquYtfVDPJbr0rESzS/view?usp=drive_link


Humanoid Robot: Chatbot powered by LLMs
