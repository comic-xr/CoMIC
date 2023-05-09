# @Time    : 4/15/22 8:54 AM
# @Author  : Ruizhi Cheng
# @FileName: E2Elatency.py
# @Email   : rcheng4@gmu.edu
import numpy as np,scipy.stats as st
from datetime import datetime, timedelta
# from scapy import *
# from scapy.utils import rdpcap


def convert_ms_to_s(list):
    res = list.copy()
    for i in range(len(res)):
        res[i] = res[i] / 1000
    return res


def convert_s_to_ms(list):
    res = list.copy()
    for i in range(len(res)):
        res[i] = res[i] * 1000
    return res





######################
####time unit : ms####
######################
#####unix timestamp
######1s = 1000
#######1min=60000


# PING between gateway and server
AP_server_ping = 2.967
Quest2_normal_each_frame = 1000 / 72

U1_whole_FPS = 67.502
U1_each_frame_ms = 1000 / U1_whole_FPS

U1_time_fps = 58.847
U1_unixtime_start = 1652731160924
U1_unixtime_start_frame = 1
U1_time_each_frame_ms = 1000 / U1_time_fps
U1_time_seg = 6000
U1_time_video_start_timestamp = 31.53
# U1_start_timestamp
# U1_start_time = U1_unixtime_start -U1_time_seg - (U1_unixtime_start_frame-1)*U1_time_each_frame_ms
U1_start_time = U1_unixtime_start - U1_time_seg - U1_time_video_start_timestamp

U1_AP_ping_1 = 8.369
U1_AP_ping_2 = 3.464
#U1_AP_ping = (U1_AP_ping_1 + U1_AP_ping_2) / 2

##husb 3U
U1_AP_ping = 6.863


# time diff NTP - AP
# time diff AP - Quest2
U1_AP_Quest2_offset_1 = -28.553640625
U1_AP_Quest2_offset_2 = -29.574041015625


U1_AP_Quest2_offset = np.mean([U1_AP_Quest2_offset_1,U1_AP_Quest2_offset_2]) - U1_AP_ping / 2

U1_start_time = U1_start_time + U1_AP_Quest2_offset

U1_action_FPS = 70.62
U1_action_time = []


U1_action_timestamp=[3717,3897]
U2_action_timestamp=[1753,2546]


U1_action_segtime = 175000
for i in range(len(U1_action_timestamp)):
    U1_action_time.append(U1_start_time + U1_action_segtime +
                          U1_action_timestamp[i])



U2_whole_FPS = 69.158
U2_each_frame_ms = 1000 / U2_whole_FPS
U2_time_fps = 63.78
U2_unixtime_start = 1652731167141
U2_unixtime_start_frame = 10
U2_time_each_frame_ms = 1000 / U2_time_fps
U2_time_seg = 10000
U2_time_video_start_timestamp = 114.977
U2_start_time = U2_unixtime_start - U2_time_seg - U2_time_video_start_timestamp

U2_AP_ping_1 = 8.449
U2_AP_ping_2 = 3.789
U2_AP_ping = (U2_AP_ping_1 + U2_AP_ping_2) / 2



U2_AP_Quest2_offset_1 = -67.24744921875
U2_AP_Quest2_offset_2 = -62.88229296875
U2_AP_Quest2_offset = np.mean([U2_AP_Quest2_offset_1,U2_AP_Quest2_offset_2]) - U2_AP_ping / 2


U2_start_time = U2_start_time + U2_AP_Quest2_offset



U2_action_FPS = 71.443
U2_action_time = []
U2_action_segtime = 175000
for i in range(len(U2_action_timestamp)):
    U2_action_time.append(U2_start_time + U2_action_segtime +
                          U2_action_timestamp[i])

U1_action_time_s = convert_ms_to_s(U1_action_time)
U2_action_time_s = convert_ms_to_s(U2_action_time)
# U1_AP_timestamp_ms = convert_s_to_ms(U1_AP_timestamp_s)
# U2_AP_timestamp_ms = convert_s_to_ms(U2_AP_timestamp_s)
end2end = []
sender_AP = []
receiver_AP = []
AP_server_AP = []
sender_process = []
receiver_process = []
server_process = []
for i in range(len(U1_action_time)):
    # print(U1_action_time_s[i])
    end2end.append(U2_action_time[i] - U1_action_time[i])
    # sender_AP.append(U1_AP_timestamp_ms[i] - U1_action_time[i])
    # receiver_AP.append(U2_action_time[i] - U2_AP_timestamp_ms[i])
    # AP_server_AP.append(end2end[i] - sender_AP[i] - receiver_AP[i])
    # print("frame.time_epoch >={0} and frame.time_epoch <={1} and ip.src==192.168.2.4".format(U1_action_time_s[i],U2_action_time_s[i]))
    # print("frame.time_epoch >={0} and frame.time_epoch <={1} and ip.dst==192.168.2.6".format(U1_action_time_s[i],U2_action_time_s[i]))
    #
    # sender_process.append(sender_AP[i] - U1_AP_ping / 2)
    # receiver_process.append(receiver_AP[i] - U2_AP_ping / 2)
    # server_process.append(AP_server_AP[i] - AP_server_ping)
# print(U2_action_time[2]-U2_AP_timestamp_ms[2])
# print(U1_AP_timestamp_ms[2] - U1_action_time[2])
# print(end2end[0]-sender_process[0]-reciver_process[0])
# print(U1_action_time_s)
# print(U2_action_time_s)
# print(U1_action_time)
# print(end2end)
print(end2end)
print(np.mean(end2end),np.std(end2end))
print(st.norm.interval(0.95, loc=np.mean(end2end), scale=st.sem(end2end)))
# print(np.mean(sender_AP),np.std(sender_AP))
# print(np.mean(receiver_AP),np.std(receiver_AP))
# print(np.mean(AP_server_AP),np.std(AP_server_AP))
# print(np.mean(sender_process),np.std(sender_process))
# print(np.mean(receiver_process),np.std(receiver_process))
# print(np.mean(server_process),np.std(server_process))
# print(U1_AP_ping)
# print(U2_AP_ping)
# print(AP_server_ping)

