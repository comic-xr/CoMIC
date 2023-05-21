import triad_openvr
import time
from datetime import datetime
import sys
from pytz import timezone
import numpy as np
import csv
from copy import deepcopy

v = triad_openvr.triad_openvr()
v.print_discovered_objects()

# If a parameter is given, use this parameter to save the data 
if len(sys.argv) > 1:
    pathToFile = sys.argv[1]

list_of_devices = list(v.devices.keys())

# check if the wanted devices are found inside of the list
if not "controller_1" in list_of_devices or not "controller_2" in list_of_devices or not "hmd_1" in list_of_devices or not "tracking_reference_2" in v.devices.keys():
    print("[WARNING] - Not all required controller/hmd are found!\nFound Devices:")
    print(list(v.devices.keys()))
    exit()

# lists of column names from relevant data
column_names_time = ["timestamp", "duration_ms"]
column_names_pose_quaternion = ["pos_x", "pos_y", "pos_z", "rot_w", "rot_x", "rot_y", "rot_z"]
column_names_velocity = ["vel_x", "vel_y", "vel_z"]
column_names_angular_velocity = ["vel_ang_x", "vel_ang_y", "vel_ang_z"]
column_names_controller = ["trigger", "trackpad_x", "trackpad_y", "ul_button_pressed", "ul_button_touched",
                           "menu_button", "trackpad_pressed", "trackpad_touched", "grip_button"]
feature_mapping_for_lib = {
    "ul_button_pressed": "ulButtonPressed",
    "ul_button_touched": "ulButtonTouched"
}


column_names_all = deepcopy(column_names_time)
for name in list_of_devices:
    column_names_all.extend([name + '_' + column_name for column_name in column_names_pose_quaternion])
    column_names_all.extend([name + '_' + column_name for column_name in column_names_velocity])
    column_names_all.extend([name + '_' + column_name for column_name in column_names_angular_velocity])
    column_names_all.extend([name + '_' + column_name for column_name in column_names_controller])

pathToFile = "Motion_User15_Cat.csv"
csv_file = open(pathToFile, 'w+', newline='')

# write the header to file
writer = csv.DictWriter(csv_file, fieldnames=column_names_all)
writer.writeheader()
data_row = {k: np.NaN for k in column_names_all}

timeHeap = 0
initTime = round(time.time() * 1000)

running = True
skippedRows = 0
max_fps = 100

last_time_step = None

while running:
    try:

        # FPS limiter
        # If the time passed has not been enough, skip this recording frame
        if last_time_step is not None and (
                datetime.now() - last_time_step).total_seconds() * 1000 < 1 / max_fps * 1000:
            continue

        # Set the new used timestep
        last_time_step = datetime.now()

        # Reset Dict
        for column_name in column_names_all:
            data_row[column_name] = np.NaN

        data_row[column_names_time[0]] = last_time_step.astimezone(timezone("US/Eastern")).strftime(
            "%H_%M_%S_%f")  # absolute timestamp

        timeHeap = round(time.time() * 1000) - initTime  # current timestep
        data_row[column_names_time[1]] = timeHeap

        for device in list_of_devices:

            pose_quaternion_data = v.devices[device].get_pose_quaternion()
            if pose_quaternion_data is not None:
                pose_quaternion_data[0] *= 100
                pose_quaternion_data[1] *= 100
                pose_quaternion_data[2] *= 100
                for column_name, value in zip(column_names_pose_quaternion, pose_quaternion_data):
                    data_row[device + '_' + column_name] = value

            velocity_data = v.devices[device].get_velocity()
            if velocity_data is not None:
                for column_name, value in zip(column_names_velocity, velocity_data):
                    data_row[device + '_' + column_name] = value

            velocity_angular_data = v.devices[device].get_angular_velocity()
            if velocity_angular_data is not None:
                for column_name, value in zip(column_names_angular_velocity, velocity_angular_data):
                    data_row[device + '_' + column_name] = value

            controller_data = v.devices[device].get_controller_inputs()
            if controller_data is not None:
                for column_name in column_names_controller:
                    data_row[device + '_' + column_name] = float(controller_data[feature_mapping_for_lib.get(column_name, column_name)])

        writer.writerow(data_row)
        print("\rLasted seconds: " + str(int(timeHeap / 1000)), end="")

    except Exception as e:
        print("[WARNING] (" + str(e) + ") - Not able to gather information from one of the devices at time " + str(
            datetime.now().astimezone(timezone("Europe/Berlin")).strftime(
                "%Y-%m-%d %H:%M:%S.%f")) + ". Skipping the whole timestep ...")

        skippedRows += 1
        continue
