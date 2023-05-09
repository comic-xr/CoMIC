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


def get_avg(list):
    list.remove(min(list))
    list.remove(min(list))
    list.remove(max(list))
    list.remove(max(list))
    return np.mean(list)


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

##hubs 3U
U1_AP_Quest2_offset = -74.342388671875
##5U
U1_AP_Quest2_offset = -44.922837890625

#U1_AP_Quest2_offset = U1_AP_Quest2_offset_1 - U1_AP_ping / 2
# U1_AP_Quest2_offset = np.mean([U1_AP_Quest2_offset_1,U1_AP_Quest2_offset_2]) - U1_AP_ping / 2
# U1_AP_Quest2_offset = U1_AP_Quest2_offset_1*1000

U1_start_time = U1_start_time + U1_AP_Quest2_offset

U1_action_FPS = 70.62
U1_action_time = []

# U1_action_frame = [280,458]
# U2_action_frame= [144,318]

#####3U
# U1_action_timestamp = [4023,4803,5639]
# U2_action_timestamp = [2056,2856,3675]

#####5U
# U1_action_timestamp=[3188,3906,4747,5499,6251]
# U2_action_timestamp=[1255,2003,2854,3536,4330]

#####7U
U1_action_timestamp=[3717,3897]
U2_action_timestamp=[1753,2546]

# U1_AP_timestamp_s = []
# U2_AP_timestamp_s = []

U1_action_segtime = 175000
for i in range(len(U1_action_timestamp)):
    U1_action_time.append(U1_start_time + U1_action_segtime +
                          U1_action_timestamp[i])

# U1_action_time_s = convert_ms_to_s(U1_action_time)


U2_whole_FPS = 69.158
U2_each_frame_ms = 1000 / U2_whole_FPS
U2_time_fps = 63.78
U2_unixtime_start = 1652731167141
U2_unixtime_start_frame = 10
U2_time_each_frame_ms = 1000 / U2_time_fps
U2_time_seg = 10000
U2_time_video_start_timestamp = 114.977
# U2_start_time = U2_unixtime_start -U2_time_seg - (U2_unixtime_start_frame-1)*U2_time_each_frame_ms
U2_start_time = U2_unixtime_start - U2_time_seg - U2_time_video_start_timestamp

U2_AP_ping_1 = 8.449
U2_AP_ping_2 = 3.789
U2_AP_ping = (U2_AP_ping_1 + U2_AP_ping_2) / 2

##hus 3U
U2_AP_ping = 3.804
### 5U
U2_AP_ping = 4.125
# time diff NTP - AP
# U2_NTP_AP_offest_1 = 0.054137229919433594
# U2_NTP_AP_offest_2 = 0.053801536560058594
# U2_NTP_AP_offest = np.mean([U2_NTP_AP_offest_1,U2_NTP_AP_offest_2]) * 1000 - U2_AP_ping / 2
# U2_NTP_AP_offest = U2_NTP_AP_offest_1*1000
# time diff AP - Quest2
U2_AP_Quest2_offset_1 = -67.24744921875
U2_AP_Quest2_offset_2 = -62.88229296875
# U2_AP_Quest2_offset = np.mean([U2_AP_Quest2_offset_1,U2_AP_Quest2_offset_2])- U2_AP_ping / 2
# U2_AP_Quest2_offset = U2_AP_Quest2_offset_1*1000
U2_AP_Quest2_offset = U2_AP_Quest2_offset_1 - U2_AP_ping / 2
### hubs 3U
U2_AP_Quest2_offset=-100.390037109375
###5U
U2_AP_Quest2_offset=-18.638080078125

U2_start_time = U2_start_time + U2_AP_Quest2_offset

#print(U2_start_time-U1_start_time)
# exit(0)

U2_action_FPS = 71.443
U2_action_time = []
# U2_action_frame= [144,318]
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

########scapy
# PLATFORM = '../../../Worlds'
# TYPE='E2Elatency'
# DATE='0420_3'
# FILENAME = 'E2Elatency.pcapng'
# #FILENAME2 = 'normal_process.csv'
# file = os.path.join(PLATFORM,TYPE,DATE,FILENAME)
#
# pcap = rdpcap(file)
# packet = pcap[0]
# print (packet.time)


# AltspaceVR 0417

# altspace=[322.974365234375, 246.7900390625, 280.286865234375, 263.3544921875, 240.90771484375, 211.822509765625,
#  212.16943359375, 214.354248046875, 263.701171875, 232.41015625, 222.830810546875, 267.724365234375, 220.9716796875,
#  253.77490234375, 318.930419921875, 241.60107421875, 285.045166015625, 233.860107421875, 186.80224609375, 339.906494140625,
#  202.201416015625, 245.298583984375, 272.19873046875, 199.28125]
# print(np.mean(altspace))
# print(get_avg(altspace))
#
#
#
# #VRChat 0417
# vrchat = [181.571533203125, 159.937744140625, 287.50341796875, 124.09375, 146.259521484375, 104.20849609375, 128.79931640625,
#  130.254150390625, 113.568359375, 86.795166015625, 160.5205078125, 144.56201171875, 139.5673828125, 128.071533203125,
#  128.071533203125, 118.03125, 140.294677734375, 133.989501953125, 114.63623046875, 119.728759765625, 126.61669921875,
#  150.72265625, 148.29736328125]
# print(np.mean(vrchat))
# print(get_avg(vrchat))


###worlds 0420
# U1_action_timestamp = [3908.25555,6415.1888,7584.6,8894.6222,11023.111,14295.0555,15352.511,16509.1777,17789.9333,19222.8,
# 20392.7,21770.588,22884.9777,23900.5777,25000.5555,26075.4333,27481.5,28217.6444,29052.87777,30792.48888,31568.9555,32464.9333]
# U2_action_timestamp = [1962.8,4470.7555,5638.7888,6988.5777,9077.322,12348.6333,13434.8,14590.0777778,15843.6222,17263.85555,
# 18446.6,19838.8333,20966.6666,21983.2333,23068.8222,24113.2000,25519.1333,26270.7666,27120.25555,28847.0111,29654.05555,30532.24444]
# U1_AP_timestamp_s = [1650483975.777875,1650483978.270487,1650483979.439858,1650483980.777140,1650483982.877052,1650483986.150180,1650483987.236183,
# 1650483988.372107,1650483989.644130,1650483991.078939,1650483992.248054,1650483993.625302,1650483994.753179,1650483995.757239,
# 1650483996.842411,1650483997.927408,1650483999.333887,1650484000.086255,1650484000.934030,1650484002.647712,1650484003.440538,1650484004.332241]
# U2_AP_timestamp_s = [1650483975.804621,1650483978.312451,1650483979.481866,1650483980.817556,1650483982.920246,1650483986.192354,1650483987.277600,
# 1650483988.419863,1650483989.686193,1650483991.120941,1650483992.288787,1650483993.668330,1650483994.796412,1650483995.798428,
# 1650483996.884817,1650483997.968238,1650483999.374437,1650484000.127536,1650484000.975289,1650484002.688998,1650484003.483550,1