# @Time    : 2/19/22 4:49 PM
# @Author  : Ruizhi Cheng
# @FileName: disruption.py
# @Email   : rcheng4@gmu.edu


import os
import time
import sys
import argparse
import subprocess

#bandwidth unit: kbps, which means we constraint the bandwidth from 3Mbps to 0.1 Mbps

uplink_bandwidth = [1500,1200,1000,700,500,300]
#downlink_bandwidth = [2000,1000,700,500,300,200,100,50]
downlink_bandwidth = [1000,700,500,300,200,100]
uplink_latency = [100,200,300,350,400,500]
downlink_latency=[100,200,300,350,400,500]
uplink_packet_loss = [1,3,5,7,10,20]
downlink_packet_loss = [1,3,5,7,10,20]

last_time = 40

#drop
#flag = u uplink
#flag = d downlink
def bandwidth_wondershaper(args):
    if not (args.u or args.d):
        print("Please indicate uplink (u) or downlink (d)")
        return 0
    adapter = args.a
    flag = 'u' if args.u else 'd'
    bandwidth=uplink_bandwidth if flag=='u' else downlink_bandwidth
    subprocess.run("sudo wondershaper -c -a {0}".format(adapter),shell=True)
    for step in bandwidth:
        cur_step = step
        subprocess.run("sudo wondershaper -a {0} -{1} {2}".format(adapter,flag,cur_step),shell=True)
        print("sudo wondershaper -a {0} -{1} {2}".format(adapter,flag,cur_step))
        time.sleep(last_time)
        subprocess.run("sudo wondershaper -c -a {0}".format(adapter),shell=True)
        #subprocess.run("sudo wondershaper -s {0}".format(adapter))
    subprocess.run("sudo wondershaper -c -a {0}".format(adapter),shell=True)
    time.sleep(last_time)
    print('done')



def latency(args):
    adapter = args.a
    if args.d:
        subprocess.run('tc qdisc del dev {0} handle ffff: ingress'.format(adapter),shell=True)
        subprocess.run('modprobe ifb',shell=True)
        subprocess.run('ip link set dev ifb0 up',shell=True)
        subprocess.run('tc qdisc add dev {0} ingress'.format(adapter),shell=True)
        subprocess.run('tc filter add dev {0} parent ffff: protocol ip u32 match u32 0 0 flowid 1:1 action mirred egress redirect dev ifb0'.format(adapter),shell=True)
        count = 0
        for step in downlink_latency:
            if count==0:
                subprocess.run('tc qdisc add dev ifb0 root netem delay {0}ms'.format(step),shell=True)
                print('tc qdisc add dev ifb0 root netem delay {0}ms'.format(step))
                time.sleep(last_time)
                count+=1
            else:
                subprocess.run('tc qdisc change dev ifb0 root netem delay {0}ms'.format(step),shell=True)
                print(('tc qdisc change dev ifb0 root netem delay {0}ms'.format(step)))
                time.sleep(last_time)
        # subprocess.run('tc qdisc del dev {0} handle ffff: ingress'.format(adapter))
        # subprocess.run('modprobe -r ifb')

        subprocess.run('tc qdisc del dev {0} root    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev {0} ingress    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev ifb root    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev ifb ingress    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev {0} handle ffff: ingress'.format(adapter),shell=True)
        subprocess.run('modprobe -r ifb',shell=True)
        time.sleep(last_time)
        print('done')
    elif args.u:
        count = 0
        for step in uplink_latency:
            if count == 0:

                subprocess.run("tcset {0} --delay {1}ms".format(adapter,step),shell=True)
                print(' tcset {0} --delay {1}ms'.format(adapter,step))
                time.sleep(last_time)
                count+=1
            else:
                subprocess.run('tcset {0} --change --delay {1}ms'.format(adapter, step),shell=True)
                print('tcset {0} --change --delay {1}ms'.format(adapter, step))
                time.sleep(last_time)
        subprocess.run('tcdel {0} --all'.format(adapter),shell=True)
        time.sleep(last_time)
        print('done')
    else:
        print("Please indicate uplink (u) or downlink (d)")

def packet_loss(args):
    adapter = args.a
    if args.d:
        subprocess.run('tc qdisc del dev {0} handle ffff: ingress'.format(adapter),shell=True)
        subprocess.run('modprobe ifb',shell=True)
        subprocess.run('ip link set dev ifb0 up',shell=True)
        subprocess.run('tc qdisc add dev {0} ingress'.format(adapter),shell=True)
        subprocess.run(
            'tc filter add dev {0} parent ffff: protocol ip u32 match u32 0 0 flowid 1:1 action mirred egress redirect dev ifb0'.format(
                adapter),shell=True)
        count = 0
        for step in downlink_packet_loss:
            if count == 0:
                subprocess.run('tc qdisc add dev ifb0 root netem loss {0}%'.format(step),shell=True)
                print('tc qdisc add dev ifb0 root netem loss {0}%'.format(step))
                time.sleep(last_time)
                count += 1
            else:
                subprocess.run('tc qdisc change dev ifb0 root netem loss {0}%'.format(step),shell=True)
                print('tc qdisc change dev ifb0 root netem loss {0}%'.format(step))
                time.sleep(last_time)
        subprocess.run('tc qdisc del dev {0} root    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev {0} ingress    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev ifb root    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev ifb ingress    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev {0} handle ffff: ingress'.format(adapter),shell=True)
        subprocess.run('modprobe -r ifb',shell=True)
        time.sleep(last_time)
        print('done')
    elif args.u:
        count = 0
        for step in uplink_packet_loss:
            if count == 0:
                subprocess.run('tcset {0} --loss {1}%'.format(adapter, step),shell=True)
                print('tcset {0} --loss {1}%'.format(adapter, step))
                count += 1
                time.sleep(last_time)
            else:
                subprocess.run('tcset {0} --change --loss {1}%'.format(adapter, step),shell=True)
                print('tcset {0} --change --loss {1}%'.format(adapter, step))
                time.sleep(last_time)
        subprocess.run('tcdel {0} --all'.format(adapter),shell=True)
        time.sleep(last_time)
        print('done')
    else:
        print("Please indicate uplink (u) or downlink (d)")


def bandwidth_tc(args):
    adapter = args.a
    if args.d:
        subprocess.run('tc qdisc del dev {0} handle ffff: ingress'.format(adapter),shell=True)
        subprocess.run('modprobe ifb',shell=True)
        subprocess.run('ip link set dev ifb0 up',shell=True)
        subprocess.run('tc qdisc add dev {0} ingress'.format(adapter),shell=True)
        subprocess.run('tc filter add dev {0} parent ffff: protocol ip u32 match u32 0 0 flowid 1:1 action mirred egress redirect dev ifb0'.format(adapter),shell=True)
        #subprocess.run('tc qdisc add dev ifb0 root netem rate 128kbit')
        count = 0
        time.sleep(last_time)

        for step in downlink_bandwidth:
            if count==0:
                subprocess.run('tc qdisc add dev ifb0 root netem rate {0}kbit'.format(step),shell=True)
                print('tc qdisc add dev ifb0 root netem rate {0}kbit'.format(step))
                time.sleep(last_time)
                count+=1
            else:
                #subprocess.run('tc qdisc del dev {0} handle ffff: ingress'.format(adapter))
                subprocess.run('tc qdisc change dev ifb0 root netem rate {0}kbit'.format(step),shell=True)
                print('tc qdisc change dev ifb0 root netem rate {0}kbit'.format(step))
                time.sleep(last_time)
        subprocess.run('tc qdisc del dev {0} root    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev {0} ingress    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev ifb root    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev ifb ingress    2> /dev/null > /dev/null;'.format(adapter),shell=True)
        subprocess.run('tc qdisc del dev {0} handle ffff: ingress'.format(adapter))
        subprocess.run('modprobe -r ifb')
        time.sleep(last_time)
        print('done')
    elif args.u:
        count = 0
        for step in uplink_bandwidth:
            if count == 0:
                subprocess.run('tcset {0} --rate {1}kbps'.format(adapter, step),shell=True)
                #subprocess.run('tcset {0} --rate {1}kbps'.format(adapter, step))
                print('tcset {0} --rate {1}kbps'.format(adapter, step))
                count += 1
                time.sleep(last_time)
            else:
                subprocess.run('tcset {0} --change --rate {1}kbps'.format(adapter, step), shell=True)
                #subprocess.run('tcset {0} --change --rate {1}kbps'.format(adapter, step))
                print('tcset {0} --change --rate {1}kbps'.format(adapter, step))
                time.sleep(last_time)
        subprocess.run('tcdel {0} --all'.format(adapter),shell=True)
        #subprocess.run('tcdel {0} --all'.format(adapter))
        time.sleep(last_time)
        print('done')
    else:
        print("Please indicate uplink (u) or downlink (d)")


def latency_loss(args):
    adapter = args.a
    subprocess.run('tcset {0} --delay 5s --port 443'.format(adapter),shell=True)
    print('tcset {0} --delay 5s --port 443'.format(adapter))
    time.sleep(60)
    subprocess.run('tcset {0} --change --delay 10s --port 443'.format(adapter),shell=True)
    print('tcset {0} --change --delay 10s --port 443'.format(adapter))
    time.sleep(60)
    subprocess.run('tcset {0} --change --delay 15s --port 443'.format(adapter),shell=True)
    print('tcset {0} --change --delay 15s --port 443'.format(adapter))
    time.sleep(60)
    subprocess.run('tcset {0} --change --loss 100% --port 443'.format(adapter),shell=True)
    print('tcset {0} --change --loss 100% --port 443'.format(adapter))
    time.sleep(60)
    subprocess.run('tcdel {0} --all'.format(adapter),shell=True)
    time.sleep(60)
    print('done')




if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("-a", help='set the adapter', required=True)
    parser.add_argument("-b", help='bandwidth',action = 'store_true')
    parser.add_argument("-l", help='latency', action='store_true')
    parser.add_argument("-d", help='downlink',action='store_true')
    parser.add_argument("-u", help='uplink',action='store_true')
    parser.add_argument("-p", help='packet loss', action='store_true')
    parser.add_argument("-lp", help='latency+loss', action='store_true')
    args = parser.parse_args()
    if args.b:
        bandwidth_tc(args)
    elif args.l:
        latency(args)
    elif args.p:
        packet_loss(args)
    elif args.lp:
        latency_loss(args)
    else:
        print("Please indicate bandwidth(b), E2Elatency (l),or packet loss (p)")

    #main()
