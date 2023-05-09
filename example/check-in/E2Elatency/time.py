import socket
import struct
import sys
import time
import datetime
import ntplib
from datetime import datetime, timezone
import subprocess
import re
#import win32api

###sync time with
# List of servers in order of attempt of fetching
#server_list = ['pool.ntp.org','time.nist.gov']
NTP_SERVERS = ['pool.ntp.org','time.nist.gov']
TIME1970 = 2208988800
'''
Returns the epoch time fetched from the NTP server passed as argument.
Returns none if the request is timed out (5 seconds).
drop 
'''
def gettime_ntp(addr='time.nist.gov'):
    # http://code.activestate.com/recipes/117211-simple-very-sntp-client/
    TIME1970 = 2208988800
    client = socket.socket( socket.AF_INET, socket.SOCK_DGRAM )
    #https://stackoverflow.com/questions/26937857/what-does-the-x1b-47-0-message-sent-to-an-ntp-server-mean
    #RFC 5905 NTP Specification (7.3. Packet Header Variables)
    data = '\x1b' + 47 * '\0'
    data = data.encode()
    try:
        # Timing out the connection after 5 seconds, if no response received
        client.settimeout(10.0)
        client.sendto( data, (addr, 123))
        data, address = client.recvfrom( 1024 )
        if data:
            epoch_time = struct.unpack( '!12I', data )[10]
            epoch_time -= TIME1970
            return epoch_time
    except socket.timeout:
        return None



server = 'pool.ntp.org'
client = ntplib.NTPClient()
response = client.request(server, version=3)
# print(response.orig_time)
# print(response.tx_time)
# print(response.recv_time)
# print(response.dest_time)
RTT = response.recv_time - response.orig_time + response.dest_time - response.tx_time
offset = RTT/2
print("NTP server - AP: {0}".format(offset))

#print("Time difference between: ")




AP_time1=datetime.fromtimestamp(response.orig_time, timezone.utc)
NTP_server_time = datetime.fromtimestamp(response.tx_time, timezone.utc)
diff_NTP_AP = response.tx_time - response.orig_time


Quest2_time = float(subprocess.run(['adb','shell','echo','$EPOCHREALTIME'],capture_output=True).stdout.decode('utf-8'))
AP_time2 = time.time()
diff_AP_Quest2 = AP_time2-Quest2_time

Quest2_ip =  str(subprocess.run("adb shell ip addr show wlan0  | grep 'inet ' | cut -d ' ' -f 6 | cut -d / -f 1",
                               shell=True,capture_output=True).stdout.decode('utf-8'))

gateway_ip = re.match(r"(\d+\.){2}(\d+)",Quest2_ip).group()+'.1'

print(f"server: {server}")
print(f"AP time: {AP_time1}")
print(f"NTP server time: {NTP_server_time}")
#store to log
print(f"time diff NTP - AP: {diff_NTP_AP}")
print("time diff AP - Quest2:{0}".format(diff_AP_Quest2))
print("Quest 2 IP:{0}".format(Quest2_ip))


ping = float(subprocess.run("adb shell ping -c 50 {0} | tail -1| awk '{{print $4}}' | cut -d '/' -f 2".format(gateway_ip),
                      shell=True,capture_output=True).stdout.decode('utf-8'))

print("PING between Quest 2 and gateway: {0}ms".format(ping))

cur_time = datetime.now().time().strftime('%H:%M:%S')
with open(str(cur_time)+'.txt','w') as f:
    f.write(f"server: {server}\n")
    f.write(f"AP time: {AP_time1}\n")
    f.write(f"NTP server time: {NTP_server_time}\n")
    f.write(f"time diff NTP - AP: {diff_NTP_AP}\n")
    f.write("AP time:{0}\n".format(datetime.fromtimestamp(AP_time2, timezone.utc)))
    f.write("Quest 2 time:{0}\n".format(datetime.fromtimestamp(Quest2_time, timezone.utc)))
    f.write("time diff AP - Quest2:{0}\n".format(diff_AP_Quest2))
    f.write("Quest 2 IP:{0}\n".format(Quest2_ip))
    f.write("PING between Quest 2 and gateway: {0}ms\n".format(ping))
    f.write("PING between gateway and server:")

#testteset
# if __name__ == "__main__":
#     # Iterates over every server in the list until it finds time from any one.
#     for server in server_list:
#         epoch_time = gettime_ntp(server)
#         print(epoch_time)
#         if epoch_time is not None:
#             # SetSystemTime takes time as argument in UTC time. UTC time is obtained using utcfromtimestamp()
#             utcTime = datetime.datetime.utcfromtimestamp(epoch_time)
#             print(utcTime)
#             #win32api.SetSystemTime(utcTime.year, utcTime.month, utcTime.weekday(), utcTime.day, utcTime.hour, utcTime.minute, utcTime.second, 0)
#             # Local time is obtained using fromtimestamp()
#             localTime = datetime.datetime.fromtimestamp(epoch_time)
#             print("Time " + localTime.strftime("%Y-%m-%d %H:%M.%f") + " from " + server)
#             break
#         else:
#             print("Could not find time from " + server)