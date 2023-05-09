# @Time    : 3/3/22 5:19 PM
# @Author  : Ruizhi Cheng
# @FileName: video2frame.py
# @Email   : rcheng4@gmu.edu

import numpy
import cv2
import sys
import os
PLATFORM = '../../../AltspaceVR'
TYPE='E2Elatency'
DATE='0516'
# FILE = 'U1_time/time_5.mp4'
# ACTION = 'U1_time'

FILE = '7U/U2/action_1328.mp4'
ACTION = '7U/U2/'
#USER = 'U2_0509'
# FILENAME = 'U2_time.mp4'
# OUT_FILE = 'U1_action1'
#OUT_FILE ='trim'
def extract_frame(filename):
    print("file exists?", os.path.exists(filename))
    c= 1
    video = cv2.VideoCapture(filename)
    fps = video.get(cv2.CAP_PROP_FPS)
    frames = video.get(cv2.CAP_PROP_FRAME_COUNT)
    print(fps,frames)
    save_path = os.path.join(PLATFORM, TYPE, DATE, ACTION)
    if not os.path.exists(save_path):
        os.mkdir(save_path)
    while True:
        success,frame = video.read()
        if success:
            ms = video.get(cv2.CAP_PROP_POS_MSEC)
            # if c >= ACTION_TRIM_START * fps and c <= ACTION_TRIM_END * fps:
            #     print("frame :{}".format(c))
            #     try:
            #         cv2.imwrite(save_path+'/{0}.jpg'.format(c),frame)
            #     except:
            #         print('11')
            # c += 1
            # print("frame :{}".format(c))

            try:
                cv2.imwrite(save_path+'/{0}.jpg'.format(ms),frame)
            except:
                print('11')


            c+=1
            # if c>TIME_TRIM*fps:
            #     break

            # video_width = int(vc.get(cv2.CAP_PROP_FRAME_WIDTH))
            # video_height = int(vc.get(cv2.CAP_PROP_FRAME_HEIGHT))
            # fps = vc.get(cv2.CAP_PROP_FPS)
            # frames = vc.get(cv2.CAP_PROP_FRAME_COUNT)
            # print("fps = {}, frame = {}".format(fps,frames))
            # print("width={}, height={}".format(video_width,video_height))
        else:
            print("done")
            break
    video.release()


if __name__ == '__main__':
    file = os.path.join(PLATFORM, TYPE, DATE, FILE)
    extract_frame(file)
