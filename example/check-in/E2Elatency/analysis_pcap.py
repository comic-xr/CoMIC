# @Time    : 4/24/22 2:42 PM
# @Author  : Ruizhi Cheng
# @FileName: analysis_pcap.py
# @Email   : rcheng4@gmu.edu
import numpy as np
from datetime import datetime, timedelta
from scapy import *
from scapy.utils import rdpcap
from scapy.config import conf
conf.use_pcap = True
import os
#######scapy
PLATFORM = '../../../Worlds'
TYPE='E2Elatency'
DATE='0420_3'
FILENAME = 'E2Elatency.pcapng'
#FILENAME2 = 'normal_process.csv'
file = os.path.join(PLATFORM,TYPE,DATE,FILENAME)

pcap = rdpcap(file)
packet = pcap[0]
print (packet.time)