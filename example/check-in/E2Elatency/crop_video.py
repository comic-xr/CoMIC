# @Time    : 4/16/22 9:10 AM
# @Author  : Ruizhi Cheng
# @FileName: crop_video.py
# @Email   : rcheng4@gmu.edu

import os
import argparse
import subprocess
PLATFORM = '../../../AltspaceVR'
TYPE='E2Elatency'
DATE='0516'
#OUTFILE = 'U2_T/time_10.mp4'
#OUTFILE = 'U2_time/time_7.mp4'
OUTFILE = '7U/U2/action_1328.mp4'
#FILENAME = 'U1-20220426-161744.mp4'
#FILENAME = 'U1-20220516-155914.mp4'
FILENAME = 'U2-20220516-155915.mp4'
ss = '00:13:28.000'
to = '00:13:40.000'


def crop_video(filename,outfile):
    print("file exists?", os.path.exists(filename))
    subprocess.run(['ffmpeg','-ss',ss,'-to',to, '-i',filename,'-c','copy','-strict','-2',outfile])

if __name__ == '__main__':
    file = os.path.join(PLATFORM, TYPE, DATE,FILENAME)
    #outfile =  os.path.join(PLATFORM, TYPE, DATE,ACTION,USER,out_file)
    outfile = os.path.join(PLATFORM, TYPE, DATE, OUTFILE)
    crop_video(file,outfile)