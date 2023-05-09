# @Time    : 4/20/22 10:35 AM
# @Author  : Ruizhi Cheng
# @FileName: quest2_AP_sync.py
# @Email   : rcheng4@gmu.edu
import os
import time
import sys
import argparse
import subprocess
from datetime import datetime, timezone
import ntplib
#######
###### time unit: ms
#######

server_ip ={
    'w': '31.13.66.136',     #worlds
    'a': '52.183.16.42',    #altspacevr
    'r':  '91.199.81.152',   #recroom
    'v': '91.199.81.85',    #vrchat
    'm':  '54.193.101.3'   #mozilla hubs
}

def sync_time_AP_quest(args):
    server = 'pool.ntp.org'
    client = ntplib.NTPClient()
    response = client.request(server, version=3)
    # print(response.orig_time)
    # print(response.tx_time)
    # print(response.recv_time)
    # print(response.dest_time)
    RTT = response.recv_time - response.orig_time + response.dest_time - response.tx_time
    offset = RTT / 2
    print("NTP server - AP: {0}".format(offset))


    quest2_ip = '192.168.2.4' if args.u =='U1' else '192.168.2.12'
    quest2_time = float(subprocess.run(['adb','-s',quest2_ip,'shell','echo','$EPOCHREALTIME'],
                                       capture_output=True).stdout.decode('utf-8'))
    #pay attend
    quest2_time_ms = quest2_time*1000
    quest2_utc = datetime.fromtimestamp(quest2_time, timezone.utc)
    ap_time = time.time()
    ap_time_ms = ap_time*1000
    ap_utc = datetime.fromtimestamp(ap_time, timezone.utc)
    print("quest 2 utc time:{0}".format(quest2_utc))
    print("ap utc time:{0}".format(ap_utc))
    quest2_ap_ping = float(subprocess.run("adb -s {0}:5555 shell ping -c 50 192.168.2.1 | tail -1| awk '{{print $4}}' | cut -d '/' -f 2".format(quest2_ip),
                      shell=True,capture_output=True).stdout.decode('utf-8'))
    print("ap quest ping:{0}ms".format(quest2_ap_ping))
    ##### ap - quest 2
    diff_ap_quest= ap_time_ms - quest2_time_ms - quest2_ap_ping/2
    print("diff ap - quest 2:{0}ms".format(diff_ap_quest))
    # if args.s != 'own':
    #     ap_server_ping = float(subprocess.run("ping -c 50 {0} | tail -1| awk '{{print $4}}' | cut -d '/' -f 2".format(server_ip[args.s]),
    #     shell=True,capture_output=True).stdout.decode('utf-8'))
    #     print("ap server ping:{0}ms".format(ap_server_ping))
    # else:
    #     ap_server_ping = 3

    cur_time = datetime.now().time().strftime('%H%M')
    with open(str(cur_time) + args.u+ '.txt', 'w') as f:
        f.write("NTP server - AP: {0} ms\n".format(offset))
        #f.write("platform:{0}\n".format(args.s))
        f.write("AP time UTC:{0}\n".format(ap_utc))
        f.write("Quest 2 time UTC:{0}\n".format(quest2_utc))
        f.write("AP time Epoch ms:{0}\n".format(ap_time_ms))
        f.write("Quest 2 time Epoch ms:{0}\n".format(quest2_time_ms))
        f.write("time diff AP - Quest2:{0}\n".format(diff_ap_quest))
        f.write("PING between Quest 2 and gateway: {0}ms\n".format(quest2_ap_ping))
        # f.write("PING between gateway and server: {0}ms\n".format(ap_server_ping))











if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("-u", help='user',required=True)
    #parser.add_argument("-s", help='server',required=True)
    args = parser.parse_args()
    sync_time_AP_quest(args)

    #main()
